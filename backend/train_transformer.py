import pandas as pd
import numpy as np
import torch
from transformers import (
    DistilBertTokenizerFast, 
    DistilBertForSequenceClassification, 
    Trainer, 
    TrainingArguments
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import os
from preprocess import clean_tweet

# Configuration
MODEL_NAME = "distilbert-base-uncased"
DATA_PATH = "../data/covid_dataset.csv"
SAVE_PATH = "./model_transformer"
MAX_LENGTH = 128
SUBSET_SIZE = 100  # For fast synchronous demonstration
EPOCHS = 1

def load_and_prep_data():
    print("Loading data...")
    df = pd.read_csv(DATA_PATH)
    
    user_data_path = "../data/user_retrain.csv"
    if os.path.exists(user_data_path):
        print(f"Loading user tweets from {user_data_path}...")
        try:
            user_df = pd.read_csv(user_data_path)
            if not user_df.empty:
                df = pd.concat([df, user_df], ignore_index=True)
                print(f"Added {len(user_df)} user-submitted examples to the training dataset!")
        except Exception as e:
            print(f"Error loading user data: {e}")
            
    # Preprocessing
    print("Cleaning text...")
    df['text_clean'] = df['original_text'].apply(clean_tweet)
    
    # Mapping labels to integers
    # neg -> 0, neu -> 1, pos -> 2
    label_map = {'neg': 0, 'neu': 1, 'pos': 2}
    df['label'] = df['sentiment'].map(label_map)
    
    # Remove any rows with missing values after mapping
    df = df.dropna(subset=['text_clean', 'label'])
    
    # Take a subset for training speed if no GPU
    if not torch.cuda.is_available() and len(df) > SUBSET_SIZE:
        print(f"Sampling {SUBSET_SIZE} rows for CPU training...")
        df = df.sample(SUBSET_SIZE, random_state=42)
        
    return df

def compute_metrics(pred):
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='weighted')
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def train():
    df = load_and_prep_data()
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        df['text_clean'].tolist(), 
        df['label'].tolist(), 
        test_size=0.1, 
        random_state=42
    )

    print("Tokenizing data...")
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_NAME)
    
    train_encodings = tokenizer(train_texts, truncation=True, padding=True, max_length=MAX_LENGTH)
    val_encodings = tokenizer(val_texts, truncation=True, padding=True, max_length=MAX_LENGTH)

    class CovidDataset(torch.utils.data.Dataset):
        def __init__(self, encodings, labels):
            self.encodings = encodings
            self.labels = labels

        def __getitem__(self, idx):
            item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
            item['labels'] = torch.tensor(self.labels[idx])
            return item

        def __len__(self):
            return len(self.labels)

    train_dataset = CovidDataset(train_encodings, train_labels)
    val_dataset = CovidDataset(val_encodings, val_labels)

    # Initialize model
    model = DistilBertForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=3)

    print("Starting training...")
    training_args = TrainingArguments(
        output_dir='./results',
        num_train_epochs=EPOCHS,              
        per_device_train_batch_size=16,
        per_device_eval_batch_size=64,
        warmup_steps=100,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=50,
        save_strategy="steps",
        load_best_model_at_end=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    trainer.train()
    
    print("Evaluating...")
    results = trainer.evaluate()
    print(f"Final Results: {results}")

    # Save model and tokenizer
    print(f"Saving model to {SAVE_PATH}...")
    model.save_pretrained(SAVE_PATH)
    tokenizer.save_pretrained(SAVE_PATH)
    
    return results

if __name__ == "__main__":
    train()
