import pandas as pd
import numpy as np
import joblib
from data_preprocessor import DataPreprocessor
from scipy.sparse import hstack, csr_matrix

class OSSClassifier:
    """
    Production-ready OSS complaint/service classifier
    """
    def __init__(self, model_path='improved_oss_model.pkl', 
                 vectorizer_path='improved_vectorizer.pkl',
                 abbreviation_path='abbreviation_dict.json'):
        
        self.preprocessor = DataPreprocessor(abbreviation_path)
        self.model = None
        self.vectorizer = None
        
        # Load model jika ada
        try:
            self.load_model(model_path, vectorizer_path)
            print("✅ Model loaded successfully")
        except:
            print("❌ Model not found. Please train first.")
    
    def create_domain_features(self, texts):
        """
        Create domain-specific features
        """
        features = []
        
        for text in texts:
            text_lower = str(text).lower()
            
            feature_dict = {
                # Complaint indicators
                'has_tidak': 1 if 'tidak' in text_lower else 0,
                'has_belum': 1 if 'belum' in text_lower else 0,
                'has_error': 1 if any(word in text_lower for word in ['error', 'gagal', 'rusak']) else 0,
                'has_masalah': 1 if any(word in text_lower for word in ['masalah', 'kendala']) else 0,
                
                # Service indicators  
                'has_ingin': 1 if 'ingin' in text_lower else 0,
                'has_mohon': 1 if 'mohon' in text_lower else 0,
                'has_cara': 1 if any(word in text_lower for word in ['cara', 'bagaimana']) else 0,
                'has_permohonan': 1 if any(word in text_lower for word in ['permohonan', 'pengajuan']) else 0,
                'has_pembatalan': 1 if 'pembatalan' in text_lower else 0,
                
                # Technical indicators
                'has_id_izin': 1 if 'id' in text_lower and 'izin' in text_lower else 0,
                'has_sbu': 1 if 'sertifikat badan usaha' in text_lower else 0,
                'has_upload': 1 if 'upload' in text_lower else 0,
                
                # Text characteristics
                'text_length': len(text),
                'word_count': len(text.split()),
                'has_numbers': 1 if any(char.isdigit() for char in text) else 0,
                'question_marks': text.count('?'),
                'exclamation_marks': text.count('!')
            }
            
            features.append(list(feature_dict.values()))
        
        return np.array(features)
    
    def classify(self, text):
        """
        Classify single text
        Returns: dict with prediction, confidence, probabilities
        """
        if not self.model or not self.vectorizer:
            return {"error": "Model not loaded"}
        
        # Preprocess
        processed_text = self.preprocessor.preprocess_single(text)
        
        # TF-IDF features
        X_tfidf = self.vectorizer.transform([processed_text])
        
        # Domain features
        X_domain = self.create_domain_features([processed_text])
        
        # Combine features
        X = hstack([X_tfidf, csr_matrix(X_domain)])
        
        # Predict
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        label_map = {0: 'layanan', 1: 'pengaduan'}
        
        return {
            'original_text': text,
            'processed_text': processed_text,
            'prediction': label_map[prediction],
            'confidence': float(max(probabilities)),
            'probabilities': {
                'layanan': float(probabilities[0]),
                'pengaduan': float(probabilities[1])
            },
            'confidence_level': self._get_confidence_level(max(probabilities))
        }
    
    def classify_batch(self, texts):
        """
        Classify multiple texts at once
        """
        return [self.classify(text) for text in texts]
    
    def _get_confidence_level(self, confidence):
        """
        Convert confidence score to human readable level
        """
        if confidence >= 0.9:
            return 'very_high'
        elif confidence >= 0.8:
            return 'high'
        elif confidence >= 0.6:
            return 'medium'
        else:
            return 'low'
    
    def load_model(self, model_path, vectorizer_path):
        """
        Load trained model and vectorizer
        """
        self.model = joblib.load(model_path)
        self.vectorizer = joblib.load(vectorizer_path)
    
    def get_model_info(self):
        """
        Get model information
        """
        return {
            'model_type': 'Logistic Regression with Domain Features',
            'accuracy': '83.3%',
            'features': 'TF-IDF (1-3gram) + Domain-specific features',
            'training_data': '386 manually labeled OSS records',
            'class_balance': 'Weighted for imbalanced data'
        }

def demo():
    """
    Demo function untuk testing classifier
    """
    print("=== OSS CLASSIFIER DEMO ===\\n")
    
    # Initialize classifier
    classifier = OSSClassifier()
    
    if not classifier.model:
        print("❌ Model not found. Please run model_improvement.py first.")
        return
    
    # Demo data
    demo_texts = [
        "Saya ingin mengurus SBU konstruksi, bagaimana caranya?",
        "ID izin tidak ditemukan di sistem OSS", 
        "Mohon bantuan untuk pembatalan izin usaha",
        "SBU sudah kompeten tapi belum terbit sampai sekarang",
        "Cara mengupload dokumen persyaratan SIUP",
        "Error saat submit aplikasi, mohon perbaiki",
        "Permohonan perubahan alamat perusahaan di NIB",
        "Sistem tidak bisa diakses dari kemarin"
    ]
    
    print("CLASSIFICATION RESULTS:")
    print("=" * 80)
    
    for i, text in enumerate(demo_texts, 1):
        result = classifier.classify(text)
        
        print(f"[{i}] TEXT: {text}")
        print(f"    PREDICTION: {result['prediction'].upper()}")
        print(f"    CONFIDENCE: {result['confidence']:.1%} ({result['confidence_level']})")
        print(f"    PROBABILITIES: Layanan={result['probabilities']['layanan']:.1%}, "
              f"Pengaduan={result['probabilities']['pengaduan']:.1%}")
        print("-" * 80)
    
    # Model info
    print("\\nMODEL INFO:")
    info = classifier.get_model_info()
    for key, value in info.items():
        print(f"  {key}: {value}")

def classify_remaining_data():
    """
    Classify sisa data yang belum dilabel
    """
    print("=== CLASSIFYING REMAINING DATA ===\\n")
    
    classifier = OSSClassifier()
    
    if not classifier.model:
        print("❌ Model not found.")
        return
    
    # Load all data
    df_all = pd.read_csv('raw_data.csv')
    
    # Load labeled data untuk exclude
    df_labeled = pd.read_csv('labeling_template.csv')
    labeled_ids = df_labeled['id'].tolist()
    
    # Get unlabeled data
    df_unlabeled = df_all[~df_all['id'].isin(labeled_ids)].copy()
    
    print(f"Total data: {len(df_all)}")
    print(f"Labeled data: {len(labeled_ids)}")
    print(f"Unlabeled data: {len(df_unlabeled)}")
    
    if len(df_unlabeled) == 0:
        print("✅ All data already processed!")
        return
    
    # Classify unlabeled data
    print(f"\\nClassifying {len(df_unlabeled)} unlabeled records...")
    
    results = []
    for _, row in df_unlabeled.iterrows():
        result = classifier.classify(row['user_input'])
        results.append({
            'id': row['id'],
            'user_input': row['user_input'],
            'prediction': result['prediction'],
            'confidence': result['confidence'],
            'confidence_level': result['confidence_level']
        })
    
    # Save results
    df_results = pd.DataFrame(results)
    df_results.to_csv('predicted_labels.csv', index=False)
    
    # Statistics
    print(f"\\nPREDICTION SUMMARY:")
    print(f"Layanan: {len(df_results[df_results['prediction'] == 'layanan'])}")
    print(f"Pengaduan: {len(df_results[df_results['prediction'] == 'pengaduan'])}")
    
    print(f"\\nCONFIDENCE DISTRIBUTION:")
    print(df_results['confidence_level'].value_counts())
    
    print(f"\\n✅ Results saved to 'predicted_labels.csv'")
    
    return df_results

if __name__ == "__main__":
    # Run demo
    demo()
    
    # Uncomment to classify remaining data
    # classify_remaining_data()