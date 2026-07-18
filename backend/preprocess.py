import re

def clean_tweet(text):
    """
    Cleans tweet text based on user requirements:
    - Removes URLs
    - Removes Mentions (@user)
    - Removes Hashtags (#topic)
    - Removes extra whitespace
    """
    if not isinstance(text, str):
        return ""
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    
    # Remove mentions
    text = re.sub(r'@\S+', '', text)
    
    # Remove hashtags (optional: keep the text? User said "remove hashtags")
    text = re.sub(r'#\S+', '', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

if __name__ == "__main__":
    sample = "Check out the #vaccine news! @user https://t.co/example #COVID19"
    print(f"Original: {sample}")
    print(f"Cleaned:  {clean_tweet(sample)}")
