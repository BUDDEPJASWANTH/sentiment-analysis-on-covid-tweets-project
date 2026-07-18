CREATE TABLE IF NOT EXISTS tweets_sentiment (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(50) UNIQUE,
    original_text TEXT NOT NULL,
    cleaned_text TEXT,
    sentiment VARCHAR(20) NOT NULL,
    confidence_score FLOAT NOT NULL,
    score_negative FLOAT,
    score_neutral FLOAT,
    score_positive FLOAT,
    source VARCHAR(100),
    country VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster time-series queries
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets_sentiment(created_at);
CREATE INDEX IF NOT EXISTS idx_tweets_sentiment ON tweets_sentiment(sentiment);
