import os
import json
import time
import requests
import psycopg2
from confluent_kafka import Consumer, KafkaError, KafkaException

# =========================
# KAFKA CONFIG
# =========================
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')
TOPIC = os.getenv('KAFKA_TOPIC', 'covid_tweets')
GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'sentiment-processor-group')

# =========================
# FASTAPI CONFIG
# =========================
API_URL = os.getenv('API_URL', 'http://127.0.0.1:8000/predict')

# =========================
# POSTGRES CONFIG
# =========================
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '5433')
DB_NAME = os.getenv('DB_NAME', 'covid_sentiment')
DB_USER = os.getenv('DB_USER', 'covid_user')
DB_PASS = os.getenv('DB_PASS', 'covid_password')

# =========================
# DB CONNECTION (RETRY LOGIC)
# =========================
def get_db_connection(retries=5, delay=3):
    for i in range(retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            print("Connected to PostgreSQL successfully")
            return conn
        except Exception as e:
            print(f"DB connection failed (attempt {i+1}/{retries}): {e}")
            time.sleep(delay)

    return None

# =========================
# PROCESS AND STORE MESSAGE
# =========================
def process_and_store(msg_value, conn):
    try:
        payload = json.loads(msg_value)

        text = payload.get("original_text", "")
        tweet_id = payload.get("tweet_id")
        source = payload.get("source")
        country = payload.get("country")
        latitude = payload.get("latitude")
        longitude = payload.get("longitude")

        if not text:
            return

        # -------- CALL FASTAPI --------
        try:
            response = requests.post(API_URL, json={"text": text}, timeout=5)

            if response.status_code != 200:
                print(f"API Error: {response.status_code}")
                return

            result = response.json()

        except Exception as e:
            print(f"API Request failed: {e}")
            return

        sentiment = result.get('sentiment')
        confidence = result.get('confidence')
        scores = result.get('scores', {})
        cleaned_text = result.get('cleaned_text')

        # -------- INSERT INTO POSTGRES --------
        cursor = conn.cursor()

        insert_query = """
            INSERT INTO tweets_sentiment 
            (tweet_id, original_text, cleaned_text, sentiment, confidence_score,
             score_negative, score_neutral, score_positive, source,
             country, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tweet_id) DO NOTHING;
        """

        cursor.execute(insert_query, (
            tweet_id,
            text,
            cleaned_text,
            sentiment,
            confidence,
            scores.get("Negative"),
            scores.get("Neutral"),
            scores.get("Positive"),
            source,
            country,
            latitude,
            longitude
        ))

        conn.commit()
        cursor.close()

        print(f"Stored Tweet {tweet_id} -> {sentiment} (Conf: {confidence})")

    except Exception as e:
        print(f"Processing error: {e}")
        if conn:
            conn.rollback()


# =========================
# START KAFKA CONSUMER
# =========================
def start_consumer():
    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'group.id': GROUP_ID,
        'auto.offset.reset': 'latest'
    }

    consumer = Consumer(conf)
    consumer.subscribe([TOPIC])

    conn = get_db_connection()
    if not conn:
        print("Exiting: DB connection failed")
        return

    print("Started consuming messages from Kafka...")

    try:
        while True:
            msg = consumer.poll(timeout=1.0)

            if msg is None:
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    raise KafkaException(msg.error())

            process_and_store(msg.value().decode('utf-8'), conn)

    except KeyboardInterrupt:
        print("Stopping consumer...")

    finally:
        consumer.close()
        if conn:
            conn.close()


# =========================
# ENTRY POINT
# =========================
if __name__ == "__main__":
    start_consumer()