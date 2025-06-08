import pandas as pd
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime

class FileProcessor:
    """Service for processing uploaded files"""
    
    async def process_file(self, file_path: Path, file_extension: str) -> Dict[str, Any]:
        """Process uploaded file and extract metadata"""
        
        try:
            # Read file based on extension
            if file_extension == '.csv':
                df = pd.read_csv(file_path)
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif file_extension == '.json':
                df = pd.read_json(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            # Basic file info
            rows_count = len(df)
            columns_count = len(df.columns)
            
            # Process columns
            columns_info = []
            for col in df.columns:
                col_info = await self._analyze_column(df, col)
                columns_info.append(col_info)
            
            # Get preview data (first 10 rows)
            preview_data = df.head(10).to_dict('records')
            
            # Clean preview data (handle NaN, datetime, etc.)
            preview_data = self._clean_preview_data(preview_data)
            
            return {
                'rows_count': rows_count,
                'columns_count': columns_count,
                'columns': columns_info,
                'preview_data': preview_data
            }
            
        except Exception as e:
            raise Exception(f"Error processing file: {str(e)}")
    
    async def _analyze_column(self, df: pd.DataFrame, column_name: str) -> Dict[str, Any]:
        """Analyze individual column and return metadata"""
        
        col_data = df[column_name]
        
        # Basic stats
        null_count = col_data.isnull().sum()
        unique_count = col_data.nunique()
        total_count = len(col_data)
        
        # Determine data type
        dtype = str(col_data.dtype)
        if pd.api.types.is_numeric_dtype(col_data):
            col_type = 'number'
        elif pd.api.types.is_datetime64_any_dtype(col_data):
            col_type = 'date'
        elif pd.api.types.is_bool_dtype(col_data):
            col_type = 'boolean'
        else:
            col_type = 'text'
        
        # Sample values (non-null, first 5 unique values)
        sample_values = col_data.dropna().unique()[:5].tolist()
        sample_values = self._clean_sample_values(sample_values)
        
        # Additional statistics for numeric columns
        statistics = {}
        if col_type == 'number' and not col_data.empty:
            statistics = {
                'min': float(col_data.min()) if not pd.isna(col_data.min()) else None,
                'max': float(col_data.max()) if not pd.isna(col_data.max()) else None,
                'mean': float(col_data.mean()) if not pd.isna(col_data.mean()) else None,
                'median': float(col_data.median()) if not pd.isna(col_data.median()) else None,
            }
        
        return {
            'name': column_name,
            'type': col_type,
            'data_type': dtype,
            'null_count': int(null_count),
            'unique_count': int(unique_count),
            'sample_values': sample_values,
            'statistics': statistics
        }
    
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
            else:
                cleaned.append(str(val))
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
                else:
                    cleaned_row[key] = str(value)
            cleaned_data.append(cleaned_row)
        return cleaned_data
    
    async def get_preview(self, file_path: str, rows: int = 10) -> Dict[str, Any]:
        """Get preview of specific number of rows"""
        
        try:
            file_path = Path(file_path)
            file_extension = file_path.suffix.lower()
            
            # Read file
            if file_extension == '.csv':
                df = pd.read_csv(file_path, nrows=rows)
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path, nrows=rows)
            elif file_extension == '.json':
                df = pd.read_json(file_path)
                df = df.head(rows)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            preview_data = df.to_dict('records')
            return {
                'data': self._clean_preview_data(preview_data),
                'columns': list(df.columns),
                'rows_shown': len(df)
            }
            
        except Exception as e:
            raise Exception(f"Error getting preview: {str(e)}")
    
    async def validate_for_training(
        self, 
        file_path: str, 
        target_column: str, 
        feature_columns: List[str]
    ) -> Dict[str, Any]:
        """Validate dataset configuration for ML training"""
        
        try:
            file_path = Path(file_path)
            file_extension = file_path.suffix.lower()
            
            # Read file
            if file_extension == '.csv':
                df = pd.read_csv(file_path)
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif file_extension == '.json':
                df = pd.read_json(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            errors = []
            warnings = []
            recommendations = []
            
            # Check if target column exists
            if target_column not in df.columns:
                errors.append(f"Target column '{target_column}' not found")
            else:
                # Check target column properties
                target_unique = df[target_column].nunique()
                target_nulls = df[target_column].isnull().sum()
                
                if target_unique < 2:
                    errors.append(f"Target column must have at least 2 unique values (found {target_unique})")
                
                if target_nulls > 0:
                    warnings.append(f"Target column has {target_nulls} missing values")
                
                if target_unique > 50:
                    warnings.append(f"Target column has {target_unique} unique values - consider if suitable for classification")
            
            # Check feature columns
            missing_features = [col for col in feature_columns if col not in df.columns]
            if missing_features:
                errors.append(f"Feature columns not found: {', '.join(missing_features)}")
            
            # Check for sufficient data
            if len(df) < 50:
                warnings.append("Dataset has fewer than 50 rows - consider adding more data")
            
            # Check for missing values in features
            for col in feature_columns:
                if col in df.columns:
                    null_percentage = (df[col].isnull().sum() / len(df)) * 100
                    if null_percentage > 50:
                        warnings.append(f"Feature column '{col}' has {null_percentage:.1f}% missing values")
                    elif null_percentage > 10:
                        recommendations.append(f"Consider handling missing values in '{col}' ({null_percentage:.1f}% missing)")
            
            is_valid = len(errors) == 0
            
            return {
                'is_valid': is_valid,
                'errors': errors,
                'warnings': warnings,
                'recommendations': recommendations,
                'dataset_info': {
                    'total_rows': len(df),
                    'total_columns': len(df.columns),
                    'target_column_info': {
                        'unique_values': df[target_column].nunique() if target_column in df.columns else 0,
                        'null_count': df[target_column].isnull().sum() if target_column in df.columns else 0,
                        'sample_values': df[target_column].dropna().unique()[:5].tolist() if target_column in df.columns else []
                    },
                    'feature_columns_info': [
                        {
                            'name': col,
                            'type': str(df[col].dtype),
                            'null_count': df[col].isnull().sum(),
                            'unique_count': df[col].nunique()
                        } for col in feature_columns if col in df.columns
                    ]
                }
            }
            
        except Exception as e:
            return {
                'is_valid': False,
                'errors': [f"Validation failed: {str(e)}"],
                'warnings': [],
                'recommendations': []
            }