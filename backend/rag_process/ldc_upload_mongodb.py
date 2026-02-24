import os
import pathlib
import pandas as pd
import numpy as np
import datetime
import uuid
import sys
import socket

# ✅ FIX: Robust Path Setup for imports
current_file = pathlib.Path(__file__).resolve()
project_root = current_file.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from pymongo import MongoClient
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# --- 1. ROBUST ENV LOADING ---
try:
    env_path = project_root / '.env'
    if not env_path.exists():
         env_path = pathlib.Path(os.getcwd()) / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

print(f"📖 Loading environment from: {env_path}")
load_dotenv(dotenv_path=env_path)

# --- 2. CONFIGURATION & NETWORK FIX ---

def is_running_in_docker():
    """Checks if the script is running inside a Docker container."""
    path = '/proc/self/cgroup'
    return (
        os.path.exists('/.dockerenv') or
        (os.path.isfile(path) and any('docker' in line for line in open(path)))
    )

# Load Raw Env Vars
raw_mongo_uri = os.getenv("MONGO_CONNECTION_STRING_DOC", "mongodb://root:abvn1234@localhost:27018/?authSource=admin")
raw_qdrant_host = os.getenv("QDRANT_HOST", "localhost")
raw_qdrant_port = int(os.getenv("QDRANT_PORT", 6333))

# ✅ INTELLIGENT CONNECTION SWITCHING
if is_running_in_docker():
    # 🐳 Docker Mode: Use Internal Container Names & Ports
    print("🐳 Detected DOCKER environment. Using internal network.")
    MONGO_URI = raw_mongo_uri.replace("localhost", "mongo_db").replace("127.0.0.1", "mongo_db").replace("27018", "27017")
    QDRANT_HOST = raw_qdrant_host.replace("localhost", "qdrant_db").replace("127.0.0.1", "qdrant_db")
    QDRANT_PORT = 6333
else:
    # 💻 Host Mode (Windows): Use Localhost & External Mapped Ports
    print("💻 Detected HOST environment (Windows). Switching to Localhost.")
    # Force MongoDB to use localhost:27018 (The External Port)
    if "mongo_db" in raw_mongo_uri:
        MONGO_URI = raw_mongo_uri.replace("mongo_db", "localhost").replace("27017", "27018")
    else:
        MONGO_URI = raw_mongo_uri
    
    # Force Qdrant to use localhost
    if "qdrant_db" in raw_qdrant_host:
        QDRANT_HOST = "localhost"
    else:
        QDRANT_HOST = raw_qdrant_host
    QDRANT_PORT = raw_qdrant_port

print(f"   👉 MongoDB Target: {MONGO_URI}")
print(f"   👉 Qdrant Target:  {QDRANT_HOST}:{QDRANT_PORT}")

DB_NAME = "ldc_bot"
COLLECTION_NAME = os.getenv("LDC_COLLECTION_NAME", "ldc_assistant")
QDRANT_COLLECTION = f"{COLLECTION_NAME}" 

# Files
DEFAULT_FILE_PATH = fr"E:/llm_data/chatbot_data/ldc_data/Data_SKRRHD.xlsx"
LDC_FILE_PATH = os.getenv("LDC_FILE_PATH", DEFAULT_FILE_PATH)

# --- 3. HELPER FUNCTIONS ---
def clean_risk_code(code):
    """Removes trailing dots from risk codes."""
    if pd.isna(code) or code is None:
        return ""
    return str(code).strip().rstrip('.')

def get_embedding_model():
    """Lazy load embedding model."""
    from sentence_transformers import SentenceTransformer
    model_path = os.getenv("LOCAL_EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")
    print(f"🧠 Loading embedding model: {model_path}...")
    return SentenceTransformer(model_path)

# ==========================================
# 🎯 FEATURE 1: ACTIVE LEARNING (Library Mode)
# ==========================================

def add_unanswered_question(question_text, user_id="anonymous"):
    record_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now().isoformat()
    
    doc = {
        "_id": record_id,
        "type": "user_query",
        "status": "pending",
        "search_content": question_text,
        "response_content": None,
        "metadata": {
            "user_id": user_id,
            "created_at": timestamp,
            "source": "chatbot_interaction"
        }
    }

    client = MongoClient(MONGO_URI)
    col = client[DB_NAME][COLLECTION_NAME]
    col.insert_one(doc)
    print(f"📝 [Active Learning] Logged unanswered question: {record_id}")

    try:
        model = get_embedding_model()
        vector = model.encode(question_text).tolist()
        
        q_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        
        q_client.upsert(
            collection_name=QDRANT_COLLECTION,
            points=[
                PointStruct(
                    id=record_id,
                    vector=vector,
                    payload={
                        "search_content": question_text,
                        "response_content": None,
                        "type": "user_query",
                        "status": "pending"
                    }
                )
            ]
        )
    except Exception as e:
        print(f"⚠️ [Active Learning] Failed to update Qdrant: {e}")

    return record_id

def update_question_resolution(record_id, new_answer, risk_code=None):
    client = MongoClient(MONGO_URI)
    col = client[DB_NAME][COLLECTION_NAME]
    
    timestamp = datetime.datetime.now().isoformat()

    result = col.update_one(
        {"_id": record_id}, 
        {"$set": {
            "response_content": new_answer,
            "status": "active",
            "metadata.updated_at": timestamp,
            "metadata.risk_code": risk_code
        }}
    )
    
    if result.matched_count == 0:
        print(f"❌ Record {record_id} not found.")
        return False

    try:
        q_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        q_client.set_payload(
            collection_name=QDRANT_COLLECTION,
            points=[record_id],
            payload={
                "response_content": new_answer,
                "status": "active"
            }
        )
        print(f"✅ [Active Learning] Updated Qdrant payload: {record_id}")
    except Exception as e:
        print(f"⚠️ [Active Learning] Failed to update Qdrant payload: {e}")

    return True

# ==========================================
# 🎯 FEATURE 2: BULK IMPORT (Admin Mode)
# ==========================================

def main():
    print(f"📂 Loading Excel data from: {LDC_FILE_PATH}")
    
    try:
        ldc_dict = pd.read_excel(LDC_FILE_PATH, sheet_name='data_full', dtype=str)
        risk_code = pd.read_excel(LDC_FILE_PATH, sheet_name='risk_code', dtype=str)
    except FileNotFoundError:
        print(f"❌ File not found at {LDC_FILE_PATH}. Please check path.")
        return

    print("🧹 Processing and Cleaning data...")

    rename_addinfor = {
        'Mô tả chi tiết vụ việc': 'incident_detail',
        'Mã QTRR cấp 4': 'risk_code_lvl4',
        'Chi nhánh': 'branch',
        'Phòng': 'department',
        'ĐVKD/Khối Trung tâm': 'bu',
        'Ngày phát sinh': 'report_date'
    }
    
    rename_risk = {
        'Mã QTRR cấp 1': 'risk_code_lvl1', 'Tên mã QTRR cấp 1': 'risk_name_lvl1',
        'Mã QTRR cấp 2': 'risk_code_lvl2', 'Tên mã QTRR cấp 2': 'risk_name_lvl2',
        'Mã QTRR cấp 3': 'risk_code_lvl3', 'Tên mã QTRR cấp 3': 'risk_name_lvl3',
        'Mã QTRR cấp 4': 'risk_code_lvl4', 'Tên mã QTRR cấp 4': 'risk_name_lvl4'
    }
    
    ldc_dict.rename(columns=rename_addinfor, inplace=True)
    risk_code.rename(columns=rename_risk, inplace=True)

    for col in ['risk_code_lvl1', 'risk_code_lvl2', 'risk_code_lvl3', 'risk_code_lvl4']:
        if col in risk_code.columns:
            risk_code[col] = risk_code[col].apply(clean_risk_code)

    required_cols = ['incident_detail', 'risk_code_lvl4', 'branch', 'department', 'bu', 'report_date']
    existing_cols = [c for c in required_cols if c in ldc_dict.columns]
    
    ldc_raw = ldc_dict[existing_cols].dropna(subset=['incident_detail']).drop_duplicates(['incident_detail','risk_code_lvl4'], keep = 'first').reset_index(drop=True)
    
    if 'risk_code_lvl4' in ldc_raw.columns:
        ldc_raw['risk_code_lvl4'] = ldc_raw['risk_code_lvl4'].apply(clean_risk_code)
        ldc_raw['risk_code_lvl3'] = ldc_raw['risk_code_lvl4'].apply(lambda x: x.rsplit('.', 1)[0] if isinstance(x, str) and '.' in x else x)
        ldc_raw['risk_code_lvl2'] = ldc_raw['risk_code_lvl4'].apply(lambda x: x.rsplit('.', 2)[0] if isinstance(x, str) and x.count('.') >= 2 else x)

    rsk_lvl4 = risk_code[['risk_code_lvl4', 'risk_name_lvl4']].drop_duplicates()
    rsk_lvl3 = risk_code[['risk_code_lvl3', 'risk_name_lvl3']].drop_duplicates()
    rsk_lvl2 = risk_code[['risk_code_lvl2', 'risk_name_lvl2']].drop_duplicates()

    merged = ldc_raw.merge(rsk_lvl4, on='risk_code_lvl4', how='left')
    merged = merged.merge(rsk_lvl3, on='risk_code_lvl3', how='left')
    merged = merged.merge(rsk_lvl2, on='risk_code_lvl2', how='left')

    mongo_docs = []
    print("🔄 Transforming to Unified Schema...")
    
    for _, row in merged.iterrows():
        def clean_val(val):
            return val if pd.notna(val) and str(val).lower() != 'nan' else None

        add_infor = {
            "risk_name_lv2": clean_val(row.get('risk_name_lvl2')),
            "risk_code_lv2": clean_val(row.get('risk_code_lvl2')),
            "risk_name_lv3": clean_val(row.get('risk_name_lvl3')),
            "risk_code_lv3": clean_val(row.get('risk_code_lvl3'))
        }

        metadata = {
            "risk_code": clean_val(row.get('risk_code_lvl4')),
            "branch": clean_val(row.get('branch')),
            "department": clean_val(row.get('department')),
            "bu": clean_val(row.get('bu')),
            "source_file": "Data_SKRRHD.xlsx",
            "imported_at": datetime.datetime.now().isoformat(),
            "report_date": clean_val(row.get('report_date'))
        }

        doc = {
            "_id": str(uuid.uuid4()),
            "type": "reference_data",
            "status": "active",
            "search_content": row.get('incident_detail', ''),
            "response_content": row.get('risk_name_lvl4', 'Chưa phân loại rủi ro'),
            "add_infor": add_infor,
            "metadata": metadata
        }
        mongo_docs.append(doc)

    print(f"🔌 Connecting to MongoDB: {MONGO_URI} (DB: {DB_NAME})")
    client = MongoClient(MONGO_URI)
    collection = client[DB_NAME][COLLECTION_NAME]

    delete_result = collection.delete_many({"type": "reference_data"})
    print(f"🗑️ Cleared {delete_result.deleted_count} old reference records.")

    if mongo_docs:
        collection.insert_many(mongo_docs)
        print(f"🚀 Successfully inserted {len(mongo_docs)} records.")
    else:
        print("⚠️ No valid records found to insert.")

if __name__ == "__main__":
    main()