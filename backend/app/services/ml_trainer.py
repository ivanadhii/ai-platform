import pandas as pd
import numpy as np
import json
import joblib
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.ensemble import VotingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
import nltk

class IndonesianTextProcessor:
    """Indonesian text preprocessing - ported from OSS project"""
    
    def __init__(self):
        # Load abbreviation dictionary from OSS project
        abbreviations_path = Path("Classification_Program_ML/abbreviation_dict.json")
        if abbreviations_path.exists():
            with open(abbreviations_path, 'r', encoding='utf-8') as f:
                self.abbreviations = json.load(f)
        else:
            # Fallback to basic abbreviations
            self.abbreviations = {
                "sbu": "sertifikat badan usaha",
                "kbli": "klasifikasi baku lapangan usaha indonesia",
                "npwp": "nomor pokok wajib pajak",
                "nib": "nomor induk berusaha",
                "oss": "online single submission",
                "siup": "surat izin usaha perdagangan"
            }
        
        # OSS-specific terms
        self.oss_terms = ['SBU', 'KBLI', 'NPWP', 'SKK', 'NIB', 'SIUP', 'OSS']
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize Indonesian text"""
        if pd.isna(text):
            return ""
        
        text = str(text).lower()
        
        # Expand abbreviations
        for abbr, full in self.abbreviations.items():
            text = re.sub(r'\b' + re.escape(abbr) + r'\b', full, text, flags=re.IGNORECASE)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Basic cleaning
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        text = re.sub(r'\d+', ' ', text)      # Remove numbers
        
        return text
    
    def extract_features(self, text: str) -> Dict[str, int]:
        """Extract domain-specific features"""
        features = {}
        
        # OSS term count
        for term in self.oss_terms:
            features[f'has_{term.lower()}'] = 1 if term.lower() in text.lower() else 0
        
        # Text characteristics
        features['word_count'] = len(text.split())
        features['char_count'] = len(text)
        features['question_marks'] = text.count('?')
        
        return features

class MLTrainer:
    """Main ML training class - integrates OSS system"""
    
    def __init__(self):
        self.text_processor = IndonesianTextProcessor()
        self.models_dir = Path("trained_models")
        self.models_dir.mkdir(exist_ok=True)
        
    def preprocess_data(self, df: pd.DataFrame, target_col: str, feature_cols: List[str]) -> Tuple[pd.DataFrame, pd.Series]:
        """Preprocess dataset for training"""
        
        print("🔄 Preprocessing data...")
        
        # Combine text columns if multiple
        if len(feature_cols) > 1:
            text_columns = [col for col in feature_cols if df[col].dtype == 'object']
            if text_columns:
                df['combined_text'] = df[text_columns].fillna('').agg(' '.join, axis=1)
                main_text_col = 'combined_text'
            else:
                main_text_col = feature_cols[0]
        else:
            main_text_col = feature_cols[0]
        
        # Clean text
        df[f'{main_text_col}_cleaned'] = df[main_text_col].apply(self.text_processor.clean_text)
        
        # Remove empty rows
        df = df[df[f'{main_text_col}_cleaned'].str.len() > 0]
        
        X = df[f'{main_text_col}_cleaned']
        y = df[target_col]
        
        return X, y
    
    def create_ensemble_model(self) -> Pipeline:
        """Create ensemble model like OSS project (83.3% accuracy)"""
        
        # Text vectorization (same as OSS project)
        vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.95,
            stop_words=None  # Keep Indonesian words
        )
        
        # Individual models
        logistic = LogisticRegression(random_state=42, max_iter=1000)
        naive_bayes = MultinomialNB(alpha=0.1)
        svm = SVC(kernel='linear', probability=True, random_state=42)
        
        # Ensemble (same as OSS project)
        ensemble = VotingClassifier(
            estimators=[
                ('logistic', logistic),
                ('naive_bayes', naive_bayes),
                ('svm', svm)
            ],
            voting='soft'  # Use probabilities
        )
        
        # Create pipeline
        pipeline = Pipeline([
            ('vectorizer', vectorizer),
            ('classifier', ensemble)
        ])
        
        return pipeline
    
    def train_model(self, X: pd.Series, y: pd.Series, test_size: float = 0.2) -> Dict[str, Any]:
        """Train model and return metrics"""
        
        print("🤖 Training ensemble model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Create and train model
        model = self.create_ensemble_model()
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)
        
        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        cm = confusion_matrix(y_test, y_pred)
        
        results = {
            'model': model,
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'confusion_matrix': cm.tolist(),
            'test_predictions': y_pred.tolist(),
            'test_probabilities': y_pred_proba.tolist(),
            'class_names': list(model.classes_)
        }
        
        print(f"✅ Training completed! Accuracy: {accuracy:.3f}")
        
        return results
    
    def save_model(self, model, job_id: str) -> Tuple[str, str]:
        """Save trained model and vectorizer"""
        
        model_path = self.models_dir / f"model_{job_id}.pkl"
        vectorizer_path = self.models_dir / f"vectorizer_{job_id}.pkl"
        
        # Save full pipeline
        joblib.dump(model, model_path)
        
        # Save vectorizer separately (for API usage)
        vectorizer = model.named_steps['vectorizer']
        joblib.dump(vectorizer, vectorizer_path)
        
        return str(model_path), str(vectorizer_path)