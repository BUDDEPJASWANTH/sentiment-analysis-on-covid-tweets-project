from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification, pipeline
import torch
import torch.nn.functional as F
from preprocess import clean_tweet
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import csv
import subprocess
from fastapi.responses import StreamingResponse, Response
from fpdf import FPDF
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
from insights import generate_daily_insights


# -------------------------------
# Database Configuration
# -------------------------------
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '5433')
DB_NAME = os.getenv('DB_NAME', 'covid_sentiment')
DB_USER = os.getenv('DB_USER', 'covid_user')
DB_PASS = os.getenv('DB_PASS', 'covid_password')

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {repr(e)}")
        import traceback
        traceback.print_exc()
        return None

# -------------------------------
# Load Transformer Model
# -------------------------------
MODEL_DIR = "./model_transformer"
if not os.path.exists(MODEL_DIR):
    print(f"Warning: Model directory {MODEL_DIR} not found. Ensure training is complete.")
    tokenizer = None
    model_transformer = None
else:
    print(f"Loading transformer model from {MODEL_DIR}...")
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
    model_transformer = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR, output_attentions=True)
    model_transformer.eval()

# -------------------------------
# Load Emotion Model
# -------------------------------
print("Loading emotion detection model...")
emotion_classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", top_k=1)

# -------------------------------
# Initialize FastAPI
# -------------------------------
app = FastAPI(title="COVID Sentiment Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

class TextInput(BaseModel):
    text: str
    save: bool = False

@app.get("/")
def home():
    return {"message": "COVID Sentiment API (Transformer Edition) is running"}

@app.post("/predict")
def predict(data: TextInput):
    if model_transformer is None or tokenizer is None:
        return {"error": "Model not loaded"}

    # 1. Preprocess
    cleaned_text = clean_tweet(data.text)
    
    if not cleaned_text:
        return {
            "sentiment": "Neutral", 
            "confidence": 0.0, 
            "scores": {"Negative": 0.33, "Neutral": 0.34, "Positive": 0.33},
            "cleaned_text": ""
        }

    # 2. Tokenize and Predict
    inputs = tokenizer(cleaned_text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    
    with torch.no_grad():
        outputs = model_transformer(**inputs)
        probs = F.softmax(outputs.logits, dim=-1).squeeze()
        # Extract Attentions (batch, heads, seq, seq)
        # We take the last layer, average across heads, and average across the sequence
        attentions = outputs.attentions[-1].squeeze() # (heads, seq, seq)
        avg_attentions = attentions.mean(dim=0).mean(dim=0) # (seq)
        
        # Map tokens to scores
        tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
        token_attentions = []
        for i, token in enumerate(tokens):
            if token in ["[CLS]", "[SEP]", "[PAD]"]: continue
            token_attentions.append({
                "token": token.replace("##", ""), # Handle BPE
                "score": float(avg_attentions[i].item())
            })
            
    # 3. Emotion Detection
    try:
        emotion_res = emotion_classifier(cleaned_text)
        emotion = emotion_res[0][0]['label']
    except:
        emotion = "neutral"
    
    # 4. Format Output
    label_map = ["Negative", "Neutral", "Positive"]
    prediction_idx = torch.argmax(probs).item()
    sentiment = label_map[prediction_idx]
    confidence = float(probs[prediction_idx].item())
    
    scores = {
        "Negative": float(probs[0]),
        "Neutral": float(probs[1]),
        "Positive": float(probs[2])
    }

    # 5. Save to user_retrain.csv
    try:
        csv_path = "../data/user_retrain.csv"
        file_exists = os.path.exists(csv_path)
        with open(csv_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['original_text', 'sentiment'])
            label_abbrev = {'Negative': 'neg', 'Neutral': 'neu', 'Positive': 'pos'}
            writer.writerow([data.text, label_abbrev.get(sentiment, 'neu')])
    except Exception as e:
        print(f"Failed to write to user_retrain.csv: {e}")

    # 6. Save to PostgreSQL (Only for manual entries from the frontend)
    conn = None
    if data.save:
        conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO tweets_sentiment (original_text, cleaned_text, sentiment, confidence_score, score_negative, score_neutral, score_positive, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (data.text, cleaned_text, sentiment, confidence, scores['Negative'], scores['Neutral'], scores['Positive'], 'Manual Predict'))
            conn.commit()
            cur.close()
        except Exception as e:
            print(f"Failed to save to PostgreSQL: {e}")
        finally:
            conn.close()

    return {
        "sentiment": sentiment,
        "emotion": emotion.capitalize(),
        "confidence": round(confidence, 4),
        "scores": {k: round(v, 4) for k, v in scores.items()},
        "attentions": token_attentions,
        "cleaned_text": cleaned_text
    }

@app.get("/live-stats")
def live_stats():
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
        
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Total processed in last 24h
        cursor.execute("SELECT COUNT(*) as total FROM tweets_sentiment WHERE created_at >= NOW() - INTERVAL '24 hours'")
        total_24h = cursor.fetchone()['total']
        
        # 2. Sentiment Distribution
        cursor.execute("SELECT sentiment, COUNT(*) as volume FROM tweets_sentiment GROUP BY sentiment")
        distribution = cursor.fetchall()
        
        # 3. Average confidence
        cursor.execute("SELECT sentiment, AVG(confidence_score) as avg_confidence FROM tweets_sentiment GROUP BY sentiment")
        avg_confidence = cursor.fetchall()
        
        cursor.close()
        
        return {
            "total_24h": total_24h,
            "distribution": distribution,
            "avg_confidence": avg_confidence
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

@app.post("/retrain")
def retrain_model():
    """Trigger the local transformer training script and reload exactly in memory."""
    global model_transformer, tokenizer
    try:
        # Run the training script synchronously
        print("Starting synchronous model training...")
        subprocess.run(["python", "train_transformer.py"], cwd=os.path.dirname(os.path.abspath(__file__)), check=True)
        
        # Once finished, reload the weights directly into the running FastAPI memory
        print(f"Reloading transformer model from {MODEL_DIR}...")
        tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
        model_transformer = DistilBertForSequenceClassification.from_pretrained(MODEL_DIR)
        model_transformer.eval()
        
        return {"status": "success", "message": "The model has been successfully retrained and updated in memory! Your next prediction will use the new AI."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/insights")
def get_insights():
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
    
    try:
        insights_data = generate_daily_insights(conn)
        return {"insights": insights_data}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/geo-sentiment")
def get_geo_sentiment():
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
        
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT 
                country, 
                AVG(latitude) as lat, 
                AVG(longitude) as lon,
                COUNT(*) FILTER (WHERE sentiment = 'Positive') as pos_count,
                COUNT(*) FILTER (WHERE sentiment = 'Neutral') as neu_count,
                COUNT(*) FILTER (WHERE sentiment = 'Negative') as neg_count,
                COUNT(*) as total
            FROM tweets_sentiment
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            AND country IS NOT NULL
            GROUP BY country;
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return results
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()
@app.get("/history")
def get_history():
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Fetch the last 50 processed tweets
        cur.execute("""
            SELECT id, original_text, sentiment, confidence_score, created_at, source 
            FROM tweets_sentiment 
            ORDER BY created_at DESC 
            LIMIT 50
        """)
        rows = cur.fetchall()
        return rows
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/export-csv")
def export_csv():
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
    try:
        # Use pandas to read the entire table
        df = pd.read_sql("SELECT * FROM tweets_sentiment", conn)
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        
        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = "attachment; filename=covid_sentiment_data.csv"
        return response
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

@app.get("/export-pdf")
def export_pdf():
    conn = get_db_connection()
    if not conn:
        return {"error": "Database connection failed"}
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT sentiment, COUNT(*) as volume FROM tweets_sentiment GROUP BY sentiment")
        data = cursor.fetchall()
        cursor.close()

        # 1. Generate Matalotlib Chart
        sentiments = [d['sentiment'] for d in data]
        volumes = [d['volume'] for d in data]
        # Colors: Positive (Green), Neutral (Slate), Negative (Red)
        color_map = {'Positive': '#22c55e', 'Neutral': '#64748b', 'Negative': '#ef4444'}
        colors = [color_map.get(s, '#94a3b8') for s in sentiments]

        plt.figure(figsize=(6, 4))
        plt.pie(volumes, labels=sentiments, autopct='%1.1f%%', colors=colors, startangle=140)
        plt.title('COVID-19 Sentiment Distribution')
        
        img_buf = io.BytesIO()
        plt.savefig(img_buf, format='png', bbox_inches='tight')
        img_buf.seek(0)
        plt.close()

        # 2. Build PDF
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Helvetica", 'B', 20)
        pdf.cell(190, 15, "COVID-19 Sentiment Analysis Report", ln=True, align='C')
        pdf.set_font("Helvetica", 'I', 10)
        pdf.cell(190, 10, f"Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align='C')
        pdf.ln(10)

        # Embed Chart
        temp_img_path = "temp_sentiment_chart.png"
        with open(temp_img_path, "wb") as f:
            f.write(img_buf.getbuffer())
        
        pdf.image(temp_img_path, x=15, y=40, w=180)
        
        # Table
        pdf.set_y(160)
        pdf.set_font("Helvetica", 'B', 14)
        pdf.cell(190, 10, "Statistical Summary", ln=True)
        pdf.ln(5)
        
        # Table Header
        pdf.set_fill_color(240, 240, 240)
        pdf.set_font("Helvetica", 'B', 12)
        pdf.cell(95, 10, "Sentiment Category", border=1, fill=True)
        pdf.cell(95, 10, "Total Volume", border=1, fill=True, ln=True)
        
        # Table Body
        pdf.set_font("Helvetica", '', 12)
        for row in data:
            pdf.cell(95, 10, str(row['sentiment']), border=1)
            pdf.cell(95, 10, str(row['volume']), border=1, ln=True)

        # Cleanup
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

        pdf_bytes = bytes(pdf.output())
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=sentiment_report.pdf"}
        )
    except Exception as e:
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()
