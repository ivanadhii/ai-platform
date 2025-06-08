# backend/app/services/file_processor.py - Enhanced Version

import pandas as pd
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime
import chardet
import os

class FileProcessor:
    """Enhanced service for processing uploaded files with comprehensive error handling"""
    
    def __init__(self):
        self.max_preview_rows = 1000
        self.max_sample_values = 10
    
    async def process_file(self, file_path: Path, file_extension: str) -> Dict[str, Any]:
        """Process uploaded file and extract metadata with error handling"""
        
        try:
            # Validate file exists and is readable
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            if os.path.getsize(file_path) == 0:
                raise ValueError("File is empty")
            
            # Read file based on extension with encoding detection
            df = await self._read_file_safe(file_path, file_extension)
            
            # Validate data frame
            if df.empty:
                raise ValueError("File contains no data rows")
            
            if len(df.columns) == 0:
                raise ValueError("File contains no columns")
            
            # Basic file info
            rows_count = len(df)
            columns_count = len(df.columns)
            
            # Process columns with enhanced analysis
            columns_info = []
            for col in df.columns:
                col_info = await self._analyze_column(df, col)
                # Add AI/ML recommendations
                col_info['is_recommended_target'] = self._is_potential_target(df, col)
                col_info['is_recommended_feature'] = self._is_potential_feature(df, col)
                columns_info.append(col_info)
            
            # Get preview data (first N rows)
            preview_data = df.head(self.max_preview_rows).to_dict('records')
            
            # Clean preview data (handle NaN, datetime, etc.)
            preview_data = self._clean_preview_data(preview_data)
            
            return {
                'rows_count': rows_count,
                'columns_count': columns_count,
                'columns': columns_info,
                'preview_data': preview_data,
                'file_info': {
                    'encoding': self._detect_encoding(file_path),
                    'file_size': os.path.getsize(file_path),
                    'extension': file_extension
                }
            }
            
        except Exception as e:
            raise Exception(f"Error processing file: {str(e)}")
    
    async def _read_file_safe(self, file_path: Path, file_extension: str) -> pd.DataFrame:
        """Safely read file with encoding detection and error handling"""
        
        try:
            if file_extension == '.csv':
                # Try UTF-8 first, then detect encoding
                try:
                    df = pd.read_csv(file_path, encoding='utf-8')
                except UnicodeDecodeError:
                    # Detect encoding
                    encoding = self._detect_encoding(file_path)
                    df = pd.read_csv(file_path, encoding=encoding)
                    
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            # Clean column names
            df.columns = df.columns.astype(str).str.strip()
            
            # Remove completely empty rows/columns
            df = df.dropna(how='all')  # Remove empty rows
            df = df.loc[:, ~df.columns.str.contains('^Unnamed')]  # Remove unnamed columns
            
            return df
            
        except Exception as e:
            raise Exception(f"Failed to read file: {str(e)}")
    
    def _detect_encoding(self, file_path: Path) -> str:
        """Detect file encoding"""
        try:
            with open(file_path, 'rb') as f:
                sample = f.read(10000)  # Read first 10KB
                result = chardet.detect(sample)
                return result['encoding'] or 'utf-8'
        except:
            return 'utf-8'
    
    async def _analyze_column(self, df: pd.DataFrame, column_name: str) -> Dict[str, Any]:
        """Enhanced column analysis with ML insights"""
        
        col_data = df[column_name]
        
        # Basic stats
        null_count = col_data.isnull().sum()
        unique_count = col_data.nunique()
        total_count = len(col_data)
        
        # Determine data type with better detection
        col_type, data_type = self._detect_column_type(col_data)
        
        # Get sample values (non-null, diverse)
        sample_values = self._get_sample_values(col_data)
        
        # Enhanced statistics
        statistics = self._calculate_statistics(col_data, col_type)
        
        return {
            'name': column_name,
            'type': col_type,
            'data_type': data_type,
            'null_count': int(null_count),
            'unique_count': int(unique_count),
            'total_count': int(total_count),
            'null_percentage': round((null_count / total_count) * 100, 2),
            'sample_values': sample_values,
            'statistics': statistics,
            'data_quality': self._assess_data_quality(col_data, col_type)
        }
    
    def _detect_column_type(self, col_data: pd.Series) -> tuple:
        """Enhanced column type detection"""
        
        # Remove null values for analysis
        non_null_data = col_data.dropna()
        
        if len(non_null_data) == 0:
            return 'text', 'empty'
        
        # Check if numeric
        if pd.api.types.is_numeric_dtype(col_data):
            if pd.api.types.is_integer_dtype(col_data):
                return 'number', 'integer'
            else:
                return 'number', 'float'
        
        # Check if datetime
        if pd.api.types.is_datetime64_any_dtype(col_data):
            return 'date', 'datetime'
        
        # Check if boolean
        if pd.api.types.is_bool_dtype(col_data):
            return 'boolean', 'boolean'
        
        # For text columns, try to detect if they could be numeric
        if col_data.dtype == 'object':
            # Try to convert to numeric
            numeric_convertible = pd.to_numeric(non_null_data, errors='coerce').notna().sum()
            numeric_percentage = numeric_convertible / len(non_null_data)
            
            if numeric_percentage > 0.8:  # 80% convertible to numeric
                return 'number', 'convertible_numeric'
            
            # Check if date-like
            try:
                pd.to_datetime(non_null_data.head(100), errors='coerce', infer_datetime_format=True)
                return 'date', 'convertible_date'
            except:
                pass
        
        return 'text', 'string'
    
    def _get_sample_values(self, col_data: pd.Series) -> List[Any]:
        """Get diverse sample values"""
        
        non_null_data = col_data.dropna()
        
        if len(non_null_data) == 0:
            return []
        
        # Get unique values first
        unique_vals = non_null_data.unique()
        
        # Take up to max_sample_values, prioritizing diversity
        if len(unique_vals) <= self.max_sample_values:
            sample = unique_vals
        else:
            # Take first, last, and some middle values
            sample = np.concatenate([
                unique_vals[:3],  # First 3
                unique_vals[-2:],  # Last 2
                np.random.choice(unique_vals[3:-2], 
                                min(5, len(unique_vals[3:-2])), 
                                replace=False) if len(unique_vals) > 5 else []
            ])
        
        return self._clean_sample_values(sample.tolist())
    
    def _calculate_statistics(self, col_data: pd.Series, col_type: str) -> Dict[str, Any]:
        """Calculate relevant statistics based on column type"""
        
        stats = {}
        
        if col_type == 'number':
            non_null_data = col_data.dropna()
            if len(non_null_data) > 0:
                stats = {
                    'min': float(non_null_data.min()),
                    'max': float(non_null_data.max()),
                    'mean': float(non_null_data.mean()),
                    'median': float(non_null_data.median()),
                    'std': float(non_null_data.std()) if len(non_null_data) > 1 else 0,
                    'outliers_count': self._count_outliers(non_null_data)
                }
        
        elif col_type == 'text':
            non_null_data = col_data.dropna().astype(str)
            if len(non_null_data) > 0:
                lengths = non_null_data.str.len()
                stats = {
                    'avg_length': float(lengths.mean()),
                    'min_length': int(lengths.min()),
                    'max_length': int(lengths.max()),
                    'most_common': non_null_data.value_counts().head(3).to_dict()
                }
        
        elif col_type == 'date':
            non_null_data = col_data.dropna()
            if len(non_null_data) > 0:
                stats = {
                    'earliest': non_null_data.min().isoformat() if hasattr(non_null_data.min(), 'isoformat') else str(non_null_data.min()),
                    'latest': non_null_data.max().isoformat() if hasattr(non_null_data.max(), 'isoformat') else str(non_null_data.max()),
                    'range_days': (non_null_data.max() - non_null_data.min()).days if hasattr(non_null_data.max(), 'isoformat') else None
                }
        
        return stats
    
    def _count_outliers(self, data: pd.Series) -> int:
        """Count outliers using IQR method"""
        try:
            Q1 = data.quantile(0.25)
            Q3 = data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            return ((data < lower_bound) | (data > upper_bound)).sum()
        except:
            return 0
    
    def _assess_data_quality(self, col_data: pd.Series, col_type: str) -> str:
        """Assess overall data quality for column"""
        
        null_percentage = (col_data.isnull().sum() / len(col_data)) * 100
        unique_percentage = (col_data.nunique() / len(col_data)) * 100
        
        if null_percentage > 50:
            return 'poor'
        elif null_percentage > 20:
            return 'fair'
        elif col_type == 'text' and unique_percentage < 5:
            return 'fair'  # Very low diversity in text
        else:
            return 'good'
    
    def _is_potential_target(self, df: pd.DataFrame, column_name: str) -> bool:
        """Determine if column could be a good target variable"""
        
        col_data = df[column_name]
        unique_count = col_data.nunique()
        total_count = len(col_data)
        
        # Good target criteria:
        # 1. Categorical with reasonable number of classes (2-20)
        # 2. Not too many missing values
        # 3. Not the ID column
        
        if col_data.isnull().sum() / total_count > 0.1:  # >10% missing
            return False
        
        if 'id' in column_name.lower():  # Likely ID column
            return False
        
        if 2 <= unique_count <= 20:  # Good for classification
            return True
        
        return False
    
    def _is_potential_feature(self, df: pd.DataFrame, column_name: str) -> bool:
        """Determine if column could be a good feature"""
        
        col_data = df[column_name]
        unique_count = col_data.nunique()
        total_count = len(col_data)
        
        # Good feature criteria:
        # 1. Has some variance (not all same value)
        # 2. Not too many missing values
        # 3. Not obviously an ID
        
        if unique_count == 1:  # No variance
            return False
        
        if col_data.isnull().sum() / total_count > 0.3:  # >30% missing
            return False
        
        if 'id' in column_name.lower() and unique_count == total_count:  # Likely unique ID
            return False
        
        return True
    
    def _clean_sample_values(self, values: List[Any]) -> List[Any]:
        """Clean sample values for JSON serialization"""
        cleaned = []
        for val in values:
            if pd.isna(val):
                continue
            elif isinstance(val, (np.integer, np.floating)):
                cleaned.append(float(val))
            elif isinstance(val, (datetime, pd.Timestamp)):
                cleaned.append(val.isoformat())
            elif isinstance(val, np.bool_):
                cleaned.append(bool(val))
            else:
                # Truncate long strings
                str_val = str(val)
                if len(str_val) > 100:
                    str_val = str_val[:97] + '...'
                cleaned.append(str_val)
        return cleaned
    
    def _clean_preview_data(self, data: List[Dict]) -> List[Dict]:
        """Clean preview data for JSON serialization"""
        cleaned_data = []
        for row in data:
            cleaned_row = {}
            for key, value in row.items():
                if pd.isna(value):
                    cleaned_row[key] = None
                elif isinstance(value, (np.integer, np.floating)):
                    cleaned_row[key] = float(value)
                elif isinstance(value, (datetime, pd.Timestamp)):
                    cleaned_row[key] = value.isoformat()
                elif isinstance(value, np.bool_):
                    cleaned_row[key] = bool(value)
                else:
                    # Truncate very long text for preview
                    str_val = str(value)
                    if len(str_val) > 200:
                        str_val = str_val[:197] + '...'
                    cleaned_row[key] = str_val
            cleaned_data.append(cleaned_row)
        return cleaned_data