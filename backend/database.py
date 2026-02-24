import os
import sys
from pymongo import MongoClient
from qdrant_client import QdrantClient
from dotenv import load_dotenv
import pathlib

# --- 1. ROBUST ENV LOADING ---
# Find the .env file by looking in common locations
current_dir = pathlib.Path(__file__).resolve().parent
search_paths = [
    current_dir.parent / '.env',       # If in backend/
    current_dir.parent.parent / '.env', # If in backend/data_ops/
    pathlib.Path(os.getcwd()) / '.env'  # Current execution directory
]

env_path = None
for path in search_paths:
    if path.exists():
        env_path = path
        break

if env_path:
    print(f"✅ [DATABASE] Loading .env from: {env_path}")
    load_dotenv(dotenv_path=env_path)
else:
    print("⚠️ [DATABASE] WARNING: Could not find .env file. Using system defaults.")

# --- 2. MongoDB Connections ---
# Try specific DOC connection first, then general, then fallback to localhost
mongo_uri = os.getenv("MONGO_CONNECTION_STRING_DOC")
if not mongo_uri:
    mongo_uri = os.getenv("MONGO_CONNECTION_STRING")
if not mongo_uri:
    mongo_uri = "mongodb://localhost:27017" # Fallback

# --- 3. Qdrant Connection ---
# ✅ FIX: Default to '127.0.0.1' instead of 'localhost' to avoid WinError 10061
q_host = os.getenv("QDRANT_HOST", "127.0.0.1") 
q_port = int(os.getenv("QDRANT_PORT", 6333))

# Sanitize host (remove inline comments if present in .env)
if "#" in q_host:
    q_host = q_host.split("#")[0].strip()

print(f"🔌 [DATABASE] Connecting to Qdrant at: {q_host}:{q_port}")

# Initialize Clients
try:
    qdrant_client = QdrantClient(host=q_host, port=q_port)
    mongo_client = MongoClient(mongo_uri)
    
    # Database A: Legal Bot (Existing)
    db_legal = mongo_client["lawbot_db"]
    legal_collection = db_legal["legal_assistant"]

    # Database B: LDC Bot (New)
    db_ldc = mongo_client["ldc_bot"]       
    ldc_collection = db_ldc["ldc_assistant"]
    
except Exception as e:
    print(f"❌ [DATABASE] Init Error: {e}")
    # Re-raise so the app fails early if DB is down
    raise e

# --- 4. Configuration Exports ---
LEGAL_COLLECTION_NAME = os.getenv("LEGAL_COLLECTION_NAME", "legal_assistant")
LDC_COLLECTION_NAME = os.getenv("LDC_COLLECTION_NAME", "ldc_assistant")