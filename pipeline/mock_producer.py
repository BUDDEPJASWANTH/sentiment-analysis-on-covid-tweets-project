import os
import json
import time
import uuid
import random
import pandas as pd
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic

# Configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')
TOPIC = os.getenv('KAFKA_TOPIC', 'covid_tweets')
DATA_PATH = os.getenv('DATA_PATH', 'data/covid_dataset.csv')

def delivery_report(err, msg):
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def create_topic_if_not_exists():
    admin_client = AdminClient({'bootstrap.servers': KAFKA_BROKER})
    topic_metadata = admin_client.list_topics(timeout=5)
    
    if TOPIC not in topic_metadata.topics:
        print(f"Topic {TOPIC} not found. Creating...")
        new_topic = NewTopic(TOPIC, num_partitions=1, replication_factor=1)
        admin_client.create_topics([new_topic])
        time.sleep(2)  # Wait for consensus
        print(f"Created topic {TOPIC}.")

def simulate_stream():
    create_topic_if_not_exists()
    producer = Producer({'bootstrap.servers': KAFKA_BROKER})
    
    print(f"Loading data from {DATA_PATH}...")
    try:
        df = pd.read_csv(DATA_PATH)
        df = df.dropna(subset=['original_text'])
        tweets = df.to_dict('records')
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return

    # Geo-location data: Country and Bounding Box [lat_min, lat_max, lon_min, lon_max]
    locations = [
        {"country": "United States", "bbox": [24.396308, 49.384358, -125.0, -66.93457]},
        {"country": "India", "bbox": [6.554607, 35.674545, 68.1624, 97.3956]},
        {"country": "United Kingdom", "bbox": [49.823887, 60.846998, -10.854492, 1.76896]},
        {"country": "Germany", "bbox": [47.270111, 55.099167, 5.866315, 15.041896]},
        {"country": "Brazil", "bbox": [-33.742087, 5.271786, -73.982817, -34.793147]},
        {"country": "South Africa", "bbox": [-34.833333, -22.125, 16.45, 32.891667]},
        {"country": "Australia", "bbox": [-43.634597, -10.668185, 113.338953, 153.569469]},
    ]

    print("Starting mock Twitter stream...")
    
    try:
        while True:
            tweet = random.choice(tweets)
            loc = random.choice(locations)
            
            lat = random.uniform(loc["bbox"][0], loc["bbox"][1])
            lon = random.uniform(loc["bbox"][2], loc["bbox"][3])
            
            payload = {
                "tweet_id": str(uuid.uuid4()),
                "original_text": str(tweet.get("original_text", "")),
                "source": str(tweet.get("source", "Unknown")),
                "country": loc["country"],
                "latitude": round(lat, 6),
                "longitude": round(lon, 6)
            }
            
            producer.produce(
                topic=TOPIC,
                value=json.dumps(payload).encode('utf-8'),
                callback=delivery_report
            )
            producer.poll(0)
            
            sleep_time = random.uniform(0.5, 2.0)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("Stopping stream...")
    finally:
        producer.flush()

if __name__ == "__main__":
    print("Waiting for Kafka to start...")
    time.sleep(10)
    simulate_stream()
