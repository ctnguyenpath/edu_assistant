import os
import re
import pathlib
import pandas as pd
import numpy as np
from tqdm import tqdm
from dotenv import load_dotenv
from pymongo import MongoClient
from qdrant_client import QdrantClient, models
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
import ssl
import time
import uuid
import sys
import socket

# --- NEW SDK IMPORT ---
from google import genai
from google.genai import types

# --- 1. ROBUST ENV LOADING ---
try:
    current_file = pathlib.Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    if str(project_root) not in sys.path:
        sys.path.append(str(project_root))
        
    env_path = project_root / '.env'
    if not env_path.exists():
         env_path = pathlib.Path(os.getcwd()) / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

load_dotenv(dotenv_path=env_path)

# --- CONFIG & ENV ---
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['PYTHONHTTPSVERIFY'] = '0'
ssl._create_default_https_context = ssl._create_unverified_context

# --- 2. CONFIGURATION & NETWORK FIX ---

def is_running_in_docker():
    """Checks if the script is running inside a Docker container."""
    path = '/proc/self/cgroup'
    return (
        os.path.exists('/.dockerenv') or
        (os.path.isfile(path) and any('docker' in line for line in open(path)))
    )

# Load Raw Env Vars
raw_mongo_uri = os.getenv("MONGO_CONNECTION_STRING", "mongodb://localhost:27018")
if "/parlant_sessions" in raw_mongo_uri:
    raw_mongo_uri = raw_mongo_uri.split("/parlant_sessions")[0] + "/?authSource=admin"

raw_qdrant_host = os.getenv("QDRANT_HOST", "127.0.0.1")
if "#" in raw_qdrant_host: raw_qdrant_host = raw_qdrant_host.split("#")[0].strip()
raw_qdrant_port = int(os.getenv("QDRANT_PORT", 6333))

# Toggle Provider
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local").lower()
raw_local_model = os.getenv("LOCAL_EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")

# ✅ INTELLIGENT CONNECTION & PATH SWITCHING
if is_running_in_docker():
    # 🐳 Docker Mode
    print("🐳 Detected DOCKER environment.")
    MONGO_URI = raw_mongo_uri.replace("localhost", "mongo_db").replace("127.0.0.1", "mongo_db").replace("27018", "27017")
    QDRANT_HOST = raw_qdrant_host.replace("localhost", "qdrant_db").replace("127.0.0.1", "qdrant_db")
    QDRANT_PORT = 6333
    LOCAL_EMBEDDING_MODEL = raw_local_model # Use the /app/models path
else:
    # 💻 Host Mode (Windows)
    print("💻 Detected HOST environment (Windows).")
    
    # Network Fixes
    if "mongo_db" in raw_mongo_uri:
        MONGO_URI = raw_mongo_uri.replace("mongo_db", "localhost").replace("27017", "27018")
    else:
        MONGO_URI = raw_mongo_uri
    
    if "qdrant_db" in raw_qdrant_host:
        QDRANT_HOST = "localhost"
    else:
        QDRANT_HOST = raw_qdrant_host
    QDRANT_PORT = raw_qdrant_port

    # ✅ MODEL PATH FIX:
    # If .env points to a Linux path like '/app/...', ignore it and use the HuggingFace ID
    if raw_local_model.startswith("/"):
        print(f"⚠️  Ignoring Linux path '{raw_local_model}' for Windows.")
        LOCAL_EMBEDDING_MODEL = "keepitreal/vietnamese-sbert"
    else:
        LOCAL_EMBEDDING_MODEL = raw_local_model

print(f"   👉 MongoDB Target: {MONGO_URI}")
print(f"   👉 Qdrant Target:  {QDRANT_HOST}:{QDRANT_PORT}")
print(f"   👉 Model Source:   {LOCAL_EMBEDDING_MODEL}")

DB_NAME = "ldc_bot"
MONGO_COLLECTION = f"{os.getenv('LDC_COLLECTION_NAME', 'ldc_assistant')}" 
QDRANT_COLLECTION = f"{os.getenv('LDC_COLLECTION_NAME', 'ldc_assistant')}"

# AI Config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004").replace("models/", "")

# ==============================================================================
# ✅ CUSTOM STOPWORDS DEFINITION
# ==============================================================================
STOPWORDS_VN = [
    "của", "và", "là", "những", "các", "được", "tại", "trong", "theo", 
    "có", "với", "cho", "người", "không", "này", "khi", "để", "về", 
    "như", "đến", "sẽ", "đã", "từ", "lên", "ra", "vào", "do", "bởi", "nên",
    "ngày", "trên", "số", "kh", "hàng", "khoản", "tiền", "tháng", "năm", 
    "việc", "định", "quy", "trình", "thông", "tin", "giấy", "đề", "nghị", "ghi", 
    "1", "2", "3"
]

# --- 3. INITIALIZATION ---
print(f"🔌 Connecting to MongoDB: {DB_NAME}.{MONGO_COLLECTION}")
mongo_client = MongoClient(MONGO_URI)
mongo_col = mongo_client[DB_NAME][MONGO_COLLECTION]

print(f"🔌 Connecting to Qdrant: {QDRANT_HOST}:{QDRANT_PORT}")
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# ✅ Check Qdrant Connection
try:
    qdrant_client.get_collections()
    print("✅ Qdrant connection established.")
except Exception as e:
    print("\n" + "="*60)
    print(f"❌ CRITICAL ERROR: Could not connect to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}")
    print("👉 Please ensure Docker is running and Qdrant container is started.")
    print("="*60 + "\n")
    sys.exit(1)

# Init Embedding Models
gemini_client = None
local_model = None

if EMBEDDING_PROVIDER == "gemini":
    if not GEMINI_API_KEY: raise ValueError("GEMINI_API_KEY missing in .env")
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    print("🧠 Using Gemini Embeddings")
else:
    print(f"🧠 Using Local Model: {LOCAL_EMBEDDING_MODEL}")
    # This will now correctly download from HuggingFace on Windows
    local_model = SentenceTransformer(LOCAL_EMBEDDING_MODEL)

# --- 4. HELPER FUNCTIONS ---

def get_embedding(text):
    """Generates vector using the selected provider"""
    if not text: return None
    try:
        if EMBEDDING_PROVIDER == "gemini":
            response = gemini_client.models.embed_content(
                model=GEMINI_EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
            )
            return response.embeddings[0].values
        else:
            return local_model.encode(text).tolist()
    except Exception as e:
        print(f"❌ Embedding Error: {e}")
        return None

def generate_keywords_map(docs):
    """Generates TF-IDF keywords for hybrid search using CUSTOM STOPWORDS."""
    print("🧮 Calculating TF-IDF Keywords with Custom Stopwords...")
    texts = [d.get('search_content', '') for d in docs]
    valid_texts = [t for t in texts if t and len(str(t).strip()) > 0]
    
    if not valid_texts:
        print("⚠️ No valid text found for TF-IDF.")
        return [[] for _ in docs]

    try:
        vectorizer = TfidfVectorizer(max_features=50, stop_words=STOPWORDS_VN)
        tfidf_matrix = vectorizer.fit_transform(texts) 
        feature_names = vectorizer.get_feature_names_out()
        
        doc_keywords = []
        for i in range(len(docs)):
            if not texts[i]: 
                doc_keywords.append([])
                continue
            
            feature_index = tfidf_matrix[i, :].nonzero()[1]
            tfidf_scores = zip(feature_index, [tfidf_matrix[i, x] for x in feature_index])
            sorted_scores = sorted(tfidf_scores, key=lambda x: x[1], reverse=True)[:5]
            keywords = [feature_names[i] for i, s in sorted_scores]
            doc_keywords.append(keywords)
            
        return doc_keywords
    except Exception as e:
        print(f"⚠️ TF-IDF Error (skipping keywords): {e}")
        return [[] for _ in docs]

# --- 5. MAIN PROCESS ---

def main():
    # 1. Fetch Data from MongoDB
    print("📥 Fetching data from MongoDB...")
    cursor = mongo_col.find({
        "$or": [
            {"type": "reference_data"},
            {"status": "active"},
            {"status": "classified"},
            {"status": "indexed"}
        ]
    })
    
    mongo_docs = list(cursor)
    if not mongo_docs:
        print("⚠️ No valid documents found in MongoDB to index.")
        return

    print(f"📊 Found {len(mongo_docs)} documents to process.")

    # 2. Generate Keywords (Hybrid Search Support)
    doc_keywords = generate_keywords_map(mongo_docs)

    # 3. Prepare Qdrant Collection
    try:
        qdrant_client.get_collection(QDRANT_COLLECTION)
        print(f"✅ Collection '{QDRANT_COLLECTION}' exists.")
    except:
        print(f"🛠️ Creating Collection '{QDRANT_COLLECTION}'...")
        vector_size = 768 # Standard for sbert
        
        qdrant_client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE)
        )
        qdrant_client.create_payload_index(QDRANT_COLLECTION, "keywords", "keyword")
        qdrant_client.create_payload_index(QDRANT_COLLECTION, "risk_code", "keyword")
        qdrant_client.create_payload_index(QDRANT_COLLECTION, "branch", "keyword")
        qdrant_client.create_payload_index(QDRANT_COLLECTION, "report_date", "keyword")

    # 4. Indexing Loop
    print(f"🚀 Ingesting to Qdrant ({EMBEDDING_PROVIDER.upper()})...")
    points = []
    
    for idx, doc in tqdm(enumerate(mongo_docs), total=len(mongo_docs)):
        text = doc.get("search_content", "")
        if not text: continue
        
        meta = doc.get("metadata", {})
        add_infor = doc.get("add_infor", {}) 
        
        vector = get_embedding(text)
        if not vector: continue

        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(doc["_id"])))

        payload = {
            "mongo_id": str(doc["_id"]),
            "search_content": text,
            "incident_detail": text,
            "response_content": doc.get("response_content"),
            "risk_code": meta.get("risk_code") or doc.get("risk_code"),
            
            "risk_name_lv2": add_infor.get("risk_name_lv2"),
            "risk_code_lv2": add_infor.get("risk_code_lv2"),
            "risk_name_lv3": add_infor.get("risk_name_lv3"),
            "risk_code_lv3": add_infor.get("risk_code_lv3"),
            
            "keywords": doc_keywords[idx],
            
            # Metadata
            "branch": meta.get("branch"),
            "department": meta.get("department"),
            "bu": meta.get("bu"),  
            "source": meta.get("source_file") or meta.get("source"),
            "report_date": meta.get("report_date")
        }

        points.append(models.PointStruct(
            id=point_id,
            vector=vector,
            payload=payload
        ))

        if len(points) >= 50:
            qdrant_client.upsert(collection_name=QDRANT_COLLECTION, points=points)
            points = []
            if EMBEDDING_PROVIDER == "gemini": time.sleep(0.5)

    if points:
        qdrant_client.upsert(collection_name=QDRANT_COLLECTION, points=points)

    print(f"✅ Indexing Complete. Processed {len(mongo_docs)} records.")

if __name__ == "__main__":
    main()