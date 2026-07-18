import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import datetime
import warnings

warnings.filterwarnings('ignore')

def generate_daily_insights(conn):
    insights = []
    
    try:
        # Get count of negative tweets in last 6 hours
        query_recent = """
            SELECT COUNT(*) FROM tweets_sentiment 
            WHERE sentiment = 'Negative' 
            AND created_at >= NOW() - INTERVAL '6 hours'
        """
        
        # Get count of negative tweets between 6 and 12 hours ago
        query_past = """
            SELECT COUNT(*) FROM tweets_sentiment 
            WHERE sentiment = 'Negative' 
            AND created_at >= NOW() - INTERVAL '12 hours'
            AND created_at < NOW() - INTERVAL '6 hours'
        """
        
        with conn.cursor() as cur:
            cur.execute(query_recent)
            recent_count = cur.fetchone()[0]
            
            cur.execute(query_past)
            past_count = cur.fetchone()[0]
            
        # Calculate percentage change
        if past_count > 0:
            pct_change = ((recent_count - past_count) / past_count) * 100
            trend_word = "increased" if pct_change > 0 else "decreased"
            pct_formatted = abs(int(pct_change))
        else:
            pct_change = 0
            trend_word = "remained stable"
            pct_formatted = 0
            
        # Fetch recent negative tweets for keyword extraction
        query_text = """
            SELECT cleaned_text FROM tweets_sentiment 
            WHERE sentiment = 'Negative' 
            AND created_at >= NOW() - INTERVAL '24 hours'
        """
        df = pd.read_sql_query(query_text, conn)
        
        keywords_str = ""
        # Need enough data for meaningful TF-IDF
        if len(df) > 5:
            # Simple TF-IDF for top n-grams
            vectorizer = TfidfVectorizer(max_features=10, stop_words='english', ngram_range=(1, 2))
            try:
                # dropna just in case
                text_data = df['cleaned_text'].dropna()
                if len(text_data) > 0:
                    tfidf_matrix = vectorizer.fit_transform(text_data)
                    
                    # Sum tfidf scores across all documents
                    sum_tfidf = tfidf_matrix.sum(axis=0)
                    scores = [(word, sum_tfidf[0, idx]) for word, idx in vectorizer.vocabulary_.items()]
                    # Sort and get top 3
                    scores = sorted(scores, key=lambda x: x[1], reverse=True)[:3]
                    
                    top_keywords = [word for word, score in scores if len(word) > 2] # avoid extremely short words
                    if top_keywords:
                        keywords_str = f", mainly driven by keywords: {', '.join(top_keywords)}."
                    else:
                        keywords_str = "."
                else:
                    keywords_str = "."
            except Exception as e:
                print(f"TF-IDF Error: {e}")
                keywords_str = "."
        else:
            keywords_str = "."
            
        # Formulate the first insight sentence
        if past_count > 0 and pct_formatted > 0:
            insight_1 = f"Negative sentiment {trend_word} by {pct_formatted}% in the last 6 hours{keywords_str}"
        elif recent_count > 0:
            insight_1 = f"There were {recent_count} negative tweets in the last 6 hours{keywords_str}"
        else:
            insight_1 = "Sentiment volume has been quiet in the last 6 hours, with no significant negative spikes."
            
        insights.append(insight_1)
        
        # Add a general volume insight
        query_total = """
            SELECT sentiment, COUNT(*) as count 
            FROM tweets_sentiment 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY sentiment
            ORDER BY count DESC
            LIMIT 1
        """
        with conn.cursor() as cur:
            cur.execute(query_total)
            dominant = cur.fetchone()
            if dominant:
                insights.append(f"The dominant sentiment over the past 24 hours has been {dominant[0]} with {dominant[1]} recorded interactions.")
                
    except Exception as e:
        print(f"Error generating insights: {e}")
        insights.append("System is currently compiling necessary signal volume to generate reliable semantic insights.")
        
    return insights
