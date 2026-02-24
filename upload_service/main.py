from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from minio import Minio
from pymongo import MongoClient
from pydantic import BaseModel
import uuid
import os
import datetime
import pathlib
import sys
import io

from dotenv import load_dotenv

# --- 1. ROBUST ENV LOADING ---
try:
    # Script is in backend/data_ops/ -> Go up 3 levels to Project Root
    env_path = pathlib.Path(__file__).resolve().parent.parent.parent / '.env'
    if not env_path.exists():
        env_path = pathlib.Path(os.getcwd()) / '.env'
except NameError:
    # Fallback for interactive console
    env_path = pathlib.Path(os.getcwd()) / '.env'

load_dotenv(dotenv_path=env_path)

# Initialize FastAPI
app = FastAPI()

# --- CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
BUCKET_NAME = "user-uploads"

MONGO_URI = os.getenv("UPLOAD_MONGO_URI", "mongodb://root:abvn1234@mongo_db:27017/?authSource=admin")
# Use the same DB name as LDC Service to ensure visibility
DB_NAME = "parlant_files" 

# --- INITIALIZE CLIENTS ---

# MinIO Client
try:
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False 
    )
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)
        print(f"✅ Bucket '{BUCKET_NAME}' created.")
except Exception as e:
    print(f"❌ MinIO Connection Error: {e}")

# MongoDB Client
try:
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[DB_NAME]
    print(f"✅ Connected to MongoDB at {DB_NAME}")
except Exception as e:
    print(f"❌ Mongo Connection Error: {e}")

# ==============================================================================
# ✅ PROGRESS TRACKING STORE
# ==============================================================================
analysis_progress = {}

class ProgressUpdate(BaseModel):
    file_id: str
    current: int
    total: int
    status: str

# ==============================================================================
# --- API ENDPOINTS ---
# ==============================================================================

@app.get("/")
def health_check():
    return {"status": "Upload Service is Running", "minio": MINIO_ENDPOINT}

# --- 1. UPLOAD ENDPOINT ---
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    user_id: str = Form("anonymous") 
):
    """
    Receives a file, saves it to MinIO at 'user_id/filename', and stores metadata in MongoDB.
    """
    try:
        # 1. Generate a unique ID for database tracking (but not for the folder)
        file_id = str(uuid.uuid4())
        
        # 2. Clean Path Construction
        # ✅ FIX: Store as "user_id/filename" to avoid random folder creation
        # This keeps the MinIO structure clean and predictable.
        object_name = f"{user_id}/{file.filename}"

        # 3. Read File Content
        # Read content into memory to get size and ensure clean upload
        content = await file.read()
        file_size = len(content)
        file_data = io.BytesIO(content)

        # 4. Upload to MinIO
        minio_client.put_object(
            BUCKET_NAME,
            object_name,
            file_data,
            length=file_size,
            content_type=file.content_type
        )

        # 5. Create Metadata Record
        # This is what LDC Service looks for
        file_metadata = {
            "file_id": file_id,
            "user_id": user_id,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "minio_bucket": BUCKET_NAME,
            "minio_path": object_name, # LDC Service needs this exact path
            "file_size": file_size,
            "status": "uploaded",
            "uploaded_at": datetime.datetime.utcnow()
        }

        # 6. Save to MongoDB
        db.uploads.insert_one(file_metadata)

        # 7. Return Clean Response
        file_metadata["_id"] = str(file_metadata["_id"])
        
        # Initialize progress
        analysis_progress[file_id] = {"current": 0, "total": 0, "status": "pending"}

        print(f"✅ Upload Success: {object_name} (ID: {file_id})")

        return {
            "status": "success",
            "message": "File uploaded successfully",
            "data": file_metadata
        }

    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# --- 2. PROGRESS ENDPOINTS ---

@app.post("/progress/update")
async def update_progress(update: ProgressUpdate):
    analysis_progress[update.file_id] = {
        "current": update.current,
        "total": update.total,
        "status": update.status
    }
    return {"status": "updated"}

@app.get("/progress/{file_id}")
async def get_progress(file_id: str):
    data = analysis_progress.get(file_id)
    if not data:
        return {"current": 0, "total": 0, "status": "pending"}
    return data