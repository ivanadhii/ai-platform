# backend/main.py - Debug Version with Better Error Handling

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid
import os
import pandas as pd
from pathlib import Path
import json
from datetime import datetime
import traceback
import sys

from app.core.auth import auth_backend, fastapi_users, current_active_user
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.models.user import User
from app.core.database import async_engine, Base

# Create upload directory
UPLOAD_DIR = Path("uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

print(f"📁 Upload directory: {UPLOAD_DIR.absolute()}")
print(f"📁 Upload directory exists: {UPLOAD_DIR.exists()}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database startup error: {e}")
    yield

app = FastAPI(
    title="AI Platform API",
    description="No-code ML training platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend), 
    prefix="/auth/jwt", 
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

def safe_process_file(file_path: Path, file_extension: str):
    """Safe file processor with extensive error handling"""
    try:
        print(f"🔄 Processing file: {file_path}")
        print(f"📁 File exists: {file_path.exists()}")
        print(f"📊 File size: {file_path.stat().st_size if file_path.exists() else 'N/A'}")
        
        # Check if pandas is available
        try:
            import pandas as pd
            print("✅ Pandas imported successfully")
        except ImportError as e:
            print(f"❌ Pandas import error: {e}")
            raise Exception("Pandas not available. Run: pip install pandas")
        
        # Read file based on extension
        print(f"📖 Reading {file_extension} file...")
        
        if file_extension == '.csv':
            try:
                df = pd.read_csv(file_path, nrows=100)  # Limit to 100 rows for testing
                print(f"✅ CSV read successfully: {len(df)} rows, {len(df.columns)} columns")
            except Exception as e:
                print(f"❌ CSV read error: {e}")
                # Try with different encoding
                try:
                    df = pd.read_csv(file_path, encoding='latin-1', nrows=100)
                    print(f"✅ CSV read with latin-1 encoding: {len(df)} rows")
                except Exception as e2:
                    print(f"❌ CSV read with latin-1 failed: {e2}")
                    raise Exception(f"Cannot read CSV file: {e}")
                    
        elif file_extension in ['.xlsx', '.xls']:
            try:
                # Check if openpyxl is available for Excel
                df = pd.read_excel(file_path, nrows=100)
                print(f"✅ Excel read successfully: {len(df)} rows, {len(df.columns)} columns")
            except ImportError as e:
                print(f"❌ Excel library error: {e}")
                raise Exception("Excel support not available. Run: pip install openpyxl")
            except Exception as e:
                print(f"❌ Excel read error: {e}")
                raise Exception(f"Cannot read Excel file: {e}")
        else:
            raise Exception(f"Unsupported file type: {file_extension}")
        
        # Basic validation
        if df.empty:
            raise Exception("File is empty or has no data")
        
        if len(df.columns) == 0:
            raise Exception("File has no columns")
        
        print(f"📊 File validation passed")
        print(f"📊 Columns: {list(df.columns)}")
        
        # Basic file info
        rows_count = len(df)
        columns_count = len(df.columns)
        
        print(f"🔄 Processing {columns_count} columns...")
        
        # Process columns (simplified version)
        columns_info = []
        for i, col in enumerate(df.columns):
            try:
                print(f"🔄 Processing column {i+1}/{columns_count}: {col}")
                
                col_data = df[col]
                null_count = int(col_data.isnull().sum())
                unique_count = int(col_data.nunique())
                
                # Simple data type detection
                if pd.api.types.is_numeric_dtype(col_data):
                    col_type = 'number'
                elif pd.api.types.is_bool_dtype(col_data):
                    col_type = 'boolean'
                else:
                    col_type = 'text'
                
                # Safe sample values
                try:
                    sample_values = col_data.dropna().head(3).tolist()
                    # Convert to strings safely
                    safe_samples = []
                    for val in sample_values:
                        try:
                            if pd.isna(val):
                                continue
                            str_val = str(val)
                            if len(str_val) > 50:
                                str_val = str_val[:47] + '...'
                            safe_samples.append(str_val)
                        except:
                            safe_samples.append("(unprintable)")
                except Exception as e:
                    print(f"⚠️ Sample values error for {col}: {e}")
                    safe_samples = []
                
                # Simple recommendations
                is_recommended_target = (
                    col_type == 'text' and 
                    2 <= unique_count <= 10 and 
                    null_count < rows_count * 0.1
                )
                
                is_recommended_feature = (
                    unique_count > 1 and 
                    null_count < rows_count * 0.5
                )
                
                column_info = {
                    'name': str(col),
                    'type': col_type,
                    'data_type': str(col_data.dtype),
                    'null_count': null_count,
                    'unique_count': unique_count,
                    'total_count': rows_count,
                    'null_percentage': round((null_count / rows_count) * 100, 2) if rows_count > 0 else 0,
                    'sample_values': safe_samples,
                    'data_quality': 'good' if null_count / rows_count < 0.1 else 'fair',
                    'is_recommended_target': is_recommended_target,
                    'is_recommended_feature': is_recommended_feature,
                }
                
                columns_info.append(column_info)
                print(f"✅ Column {col} processed successfully")
                
            except Exception as e:
                print(f"❌ Error processing column {col}: {e}")
                # Add minimal column info
                columns_info.append({
                    'name': str(col),
                    'type': 'text',
                    'data_type': 'object',
                    'null_count': 0,
                    'unique_count': 1,
                    'total_count': rows_count,
                    'null_percentage': 0,
                    'sample_values': [],
                    'data_quality': 'unknown',
                    'is_recommended_target': False,
                    'is_recommended_feature': False,
                })
        
        print(f"🔄 Getting preview data...")
        
        # Get preview data (simplified)
        try:
            preview_df = df.head(5)  # Only 5 rows for safety
            preview_data = []
            
            for _, row in preview_df.iterrows():
                row_dict = {}
                for col in df.columns:
                    try:
                        val = row[col]
                        if pd.isna(val):
                            row_dict[str(col)] = None
                        else:
                            # Convert to safe string
                            str_val = str(val)
                            if len(str_val) > 100:
                                str_val = str_val[:97] + '...'
                            row_dict[str(col)] = str_val
                    except:
                        row_dict[str(col)] = "(error)"
                preview_data.append(row_dict)
                
        except Exception as e:
            print(f"❌ Preview data error: {e}")
            preview_data = []
        
        print(f"✅ File processing completed successfully")
        
        return {
            'rows_count': rows_count,
            'columns_count': columns_count,
            'columns': columns_info,
            'preview_data': preview_data
        }
        
    except Exception as e:
        print(f"❌ File processing error: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise Exception(f"Error processing file: {str(e)}")

@app.post("/upload/file/{project_id}")
async def upload_file_debug(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(current_active_user)
):
    """Debug upload endpoint with extensive logging"""
    
    print(f"\n🔥 =============  UPLOAD DEBUG  =============")
    print(f"🔥 Upload endpoint called!")
    print(f"📂 Project ID: {project_id}")
    print(f"👤 User: {current_user.email if current_user else 'None'}")
    print(f"📁 File: {file.filename if file else 'None'}")
    print(f"📁 File content type: {file.content_type if file else 'None'}")
    
    try:
        # Step 1: Validate file
        print(f"\n🔄 Step 1: File validation...")
        
        if not file or not file.filename:
            print(f"❌ No file provided")
            raise HTTPException(status_code=400, detail="No file provided")
        
        print(f"✅ File provided: {file.filename}")
        
        # Check file extension
        file_extension = Path(file.filename).suffix.lower()
        print(f"📁 File extension: {file_extension}")
        
        allowed_extensions = {'.csv', '.xlsx', '.xls'}
        if file_extension not in allowed_extensions:
            print(f"❌ File type not supported: {file_extension}")
            raise HTTPException(
                status_code=400, 
                detail=f"File type not supported. Allowed: CSV, Excel (.xlsx, .xls)"
            )
        
        print(f"✅ File type supported: {file_extension}")
        
        # Step 2: Read file content
        print(f"\n🔄 Step 2: Reading file content...")
        
        try:
            content = await file.read()
            print(f"✅ File content read: {len(content)} bytes")
        except Exception as e:
            print(f"❌ Error reading file content: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
        
        # Validate file size
        if len(content) > 50 * 1024 * 1024:  # 50MB
            print(f"❌ File too large: {len(content)} bytes")
            raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
        
        if len(content) == 0:
            print(f"❌ File is empty")
            raise HTTPException(status_code=400, detail="File is empty")
        
        print(f"✅ File size OK: {len(content)} bytes")
        
        # Step 3: Save file
        print(f"\n🔄 Step 3: Saving file...")
        
        try:
            file_id = str(uuid.uuid4())
            filename = f"{file_id}_{file.filename}"
            file_path = UPLOAD_DIR / filename
            
            print(f"💾 Saving to: {file_path}")
            
            with open(file_path, 'wb') as f:
                f.write(content)
                
            print(f"✅ File saved successfully")
            print(f"📁 File exists: {file_path.exists()}")
            print(f"📊 Saved file size: {file_path.stat().st_size if file_path.exists() else 'N/A'}")
            
        except Exception as e:
            print(f"❌ Error saving file: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
        
        # Step 4: Process file
        print(f"\n🔄 Step 4: Processing file...")
        
        try:
            file_info = safe_process_file(file_path, file_extension)
            print(f"✅ File processing completed")
            
        except Exception as e:
            print(f"❌ Error processing file: {e}")
            print(f"❌ Full traceback: {traceback.format_exc()}")
            
            # Clean up file on error
            try:
                if file_path.exists():
                    file_path.unlink()
                    print(f"🗑️ Cleaned up file after error")
            except:
                pass
                
            raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")
        
        # Step 5: Build response
        print(f"\n🔄 Step 5: Building response...")
        
        try:
            response_data = {
                "dataset_id": file_id,
                "filename": file.filename,
                "file_size": len(content),
                "rows_count": file_info['rows_count'],
                "columns_count": file_info['columns_count'],
                "upload_status": "completed",
                "uploaded_at": datetime.utcnow().isoformat(),
                "columns": file_info['columns'],
                "preview_data": file_info['preview_data'],
                "file_path": str(file_path)
            }
            
            print(f"✅ Response built successfully")
            print(f"📊 Returning: {file_info['rows_count']} rows, {file_info['columns_count']} columns")
            print(f"🔥 =============  UPLOAD SUCCESS  =============\n")
            
            return response_data
            
        except Exception as e:
            print(f"❌ Error building response: {e}")
            raise HTTPException(status_code=500, detail=f"Error building response: {str(e)}")
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        print(f"🔥 =============  UPLOAD FAILED  =============\n")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# Test endpoints
@app.get("/")
async def root():
    try:
        import pandas as pd
        pandas_version = pd.__version__
        pandas_ok = True
    except ImportError:
        pandas_version = "Not installed"
        pandas_ok = False
    
    try:
        import openpyxl
        excel_ok = True
    except ImportError:
        excel_ok = False
    
    return {
        "message": "AI Platform API - Debug Mode",
        "version": "1.0.0",
        "status": "active",
        "upload_endpoint": "✅ Available",
        "upload_dir": str(UPLOAD_DIR.absolute()),
        "upload_dir_exists": UPLOAD_DIR.exists(),
        "dependencies": {
            "pandas": pandas_ok,
            "pandas_version": pandas_version,
            "excel_support": excel_ok
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "upload_dir": UPLOAD_DIR.exists(),
        "upload_endpoint": "available"
    }

@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan
    }