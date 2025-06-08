import json
import re
import pandas as pd
from typing import List, Dict

class DataPreprocessor:
    def __init__(self, abbreviation_file='abbreviation_dict.json'):
        """
        Initialize preprocessor dengan dictionary singkatan
        """
        with open(abbreviation_file, 'r', encoding='utf-8') as f:
            self.abbreviation_dict = json.load(f)
        
        # Stopwords bahasa Indonesia (basic)
        self.stopwords = {
            'yang', 'di', 'ke', 'dari', 'pada', 'dengan', 'untuk', 'dalam', 
            'adalah', 'ini', 'itu', 'dan', 'atau', 'juga', 'akan', 'telah',
            'sudah', 'ada', 'apa', 'siapa', 'dimana', 'kapan', 'mengapa'
        }
    
    def expand_abbreviations(self, text: str) -> str:
        """
        Expand singkatan berdasarkan dictionary
        """
        text_lower = text.lower()
        
        for abbr, full in self.abbreviation_dict.items():
            # Word boundary untuk menghindari partial replacement
            pattern = r'\b' + re.escape(abbr) + r'\b'
            text_lower = re.sub(pattern, full, text_lower)
        
        return text_lower
    
    def clean_text(self, text: str) -> str:
        """
        Cleaning text dasar
        """
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove punctuation kecuali yang penting untuk konteks
        text = re.sub(r'[^\w\s]', ' ', text)
        
        return text.strip()
    
    def remove_stopwords(self, text: str) -> str:
        """
        Remove stopwords (optional, tergantung performa)
        """
        words = text.split()
        filtered_words = [word for word in words if word not in self.stopwords]
        return ' '.join(filtered_words)
    
    def preprocess_single(self, text: str, remove_stopwords: bool = False) -> str:
        """
        Preprocessing untuk satu text
        """
        if not text or pd.isna(text):
            return ""
        
        # Step 1: Expand abbreviations
        text = self.expand_abbreviations(text)
        
        # Step 2: Clean text
        text = self.clean_text(text)
        
        # Step 3: Remove stopwords (optional)
        if remove_stopwords:
            text = self.remove_stopwords(text)
        
        return text
    
    def preprocess_batch(self, texts: List[str], remove_stopwords: bool = False) -> List[str]:
        """
        Preprocessing untuk batch data
        """
        return [self.preprocess_single(text, remove_stopwords) for text in texts]
    
    def analyze_data(self, df: pd.DataFrame, text_column: str = 'text') -> Dict:
        """
        Analisis data untuk insights sebelum preprocessing
        """
        analysis = {}
        
        # Basic stats
        analysis['total_records'] = len(df)
        analysis['empty_records'] = df[text_column].isna().sum()
        
        # Text length stats
        text_lengths = df[text_column].dropna().str.len()
        analysis['avg_length'] = text_lengths.mean()
        analysis['min_length'] = text_lengths.min()
        analysis['max_length'] = text_lengths.max()
        
        # Common abbreviations found
        all_text = ' '.join(df[text_column].dropna().str.lower())
        found_abbr = {}
        for abbr in self.abbreviation_dict.keys():
            count = len(re.findall(r'\b' + re.escape(abbr) + r'\b', all_text))
            if count > 0:
                found_abbr[abbr] = count
        
        analysis['found_abbreviations'] = dict(sorted(found_abbr.items(), 
                                                     key=lambda x: x[1], 
                                                     reverse=True)[:10])
        
        return analysis
    
    def process_dataset(self, df: pd.DataFrame, text_column: str = 'text', 
                       output_column: str = 'processed_text',
                       remove_stopwords: bool = False) -> pd.DataFrame:
        """
        Process seluruh dataset
        """
        df = df.copy()
        
        # Preprocessing
        df[output_column] = self.preprocess_batch(
            df[text_column].fillna('').tolist(), 
            remove_stopwords=remove_stopwords
        )
        
        # Remove empty processed texts
        df = df[df[output_column].str.len() > 0]
        
        return df

# Contoh penggunaan dan testing
if __name__ == "__main__":
    # Initialize preprocessor
    preprocessor = DataPreprocessor()
    
    # Sample data untuk testing
    sample_data = [
        "Sy blm bs login ke email, mohon bantuan",
        "Tdk bisa buka file PDF utk project",
        "Udh coba berkali2 tapi ga berhasil",
        "Sy ingin membuat email baru, hrs bagaimana caranya?",
        "Minta tolong buatkan panduan cara menggunakan sistem",
        "Error terus waktu upload file, knp ya?",
        "Bs minta tutorial lengkap utk fitur baru?",
        ""  # empty text
    ]
    
    print("=== TESTING DATA PREPROCESSOR ===")
    print()
    
    # Test single preprocessing
    print("1. Single Text Preprocessing:")
    print("-" * 40)
    for i, text in enumerate(sample_data[:5]):
        processed = preprocessor.preprocess_single(text)
        print(f"Original  : {text}")
        print(f"Processed : {processed}")
        print()
    
    # Test batch preprocessing
    print("2. Batch Processing:")
    print("-" * 40)
    processed_batch = preprocessor.preprocess_batch(sample_data)
    for orig, proc in zip(sample_data, processed_batch):
        if orig:  # skip empty
            print(f"'{orig}' → '{proc}'")
    
    # Test dengan DataFrame
    print("\n3. DataFrame Processing:")
    print("-" * 40)
    df = pd.DataFrame({'text': sample_data})
    
    # Analyze data
    analysis = preprocessor.analyze_data(df)
    print("Data Analysis:")
    for key, value in analysis.items():
        print(f"  {key}: {value}")
    
    # Process dataset
    df_processed = preprocessor.process_dataset(df)
    print(f"\nProcessed DataFrame shape: {df_processed.shape}")
    print(df_processed[['text', 'processed_text']].head())