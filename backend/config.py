import os
import pathlib
from dotenv import load_dotenv

# ==========================================
# 0. GLOBAL ENV LOADING
# ==========================================
# Priority 1: Absolute Host Path (for local script execution)
host_env = pathlib.Path(r"F:\Projects\chatbot_local\.env")

# Priority 2: Docker Container Path (standard location inside /app)
docker_env = pathlib.Path("/app/.env")

if host_env.exists():
    load_dotenv(dotenv_path=host_env)
    print(f"📖 Config: Loaded global .env from {host_env}")
elif docker_env.exists():
    load_dotenv(dotenv_path=docker_env)
    print(f"📖 Config: Loaded global .env from Docker path (/app/.env)")
else:
    # Fallback to current working directory discovery
    load_dotenv()
    print("⚠️ Config: .env not found at absolute paths, using default load_dotenv()")

# ==========================================
# 1. GOOGLE GEMINI & AI CONFIG
# ==========================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHAT_MODEL = os.getenv("CHAT_MODEL")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME")

# ==========================================
# 2. EMBEDDING CONTROL
# ==========================================
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local").lower()

# Gemini: "text-embedding-004" (removes 'models/' prefix for compatibility with new SDK)
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004").replace("models/", "")
LOCAL_EMBEDDING_MODEL = os.getenv("LOCAL_EMBEDDING_MODEL", "keepitreal/vietnamese-sbert")

LOCAL_VECTOR_SIZE = int(os.getenv("LOCAL_VECTOR_SIZE", 768))
GEMINI_VECTOR_SIZE = int(os.getenv("GEMINI_VECTOR_SIZE", 768))

# ==========================================
# 3. CHATBOT SERVER (PARLANT)
# ==========================================
PARLANT_HOST = os.getenv("PARLANT_HOST", "0.0.0.0")
PARLANT_PORT = int(os.getenv("PARLANT_PORT", 8800))
PARLANT_URL = os.getenv("PARLANT_URL", "http://localhost:8800")

# ==========================================
# 4. KNOWLEDGE BASE (QDRANT)
# ==========================================
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))

# Dynamic collection names appended with the provider type
_base_ldc_name = os.getenv("LDC_COLLECTION_NAME", "ldc_assistant")
_base_legal_name = os.getenv("LEGAL_COLLECTION_NAME", "legal_knowledge")

LDC_COLLECTION_NAME = f"{_base_ldc_name}_{EMBEDDING_PROVIDER}"
LEGAL_COLLECTION_NAME = f"{_base_legal_name}_{EMBEDDING_PROVIDER}"

MONGO_DB_NAME = "ldc_bot"

# ==========================================
# 5. DATABASES (Unified PostgreSQL)
# ==========================================
# MongoDB - Ensure credentials are in the connection string to avoid 'Unauthorized' errors
MONGO_CONNECTION_STRING = os.getenv("MONGO_CONNECTION_STRING")

# Primary Database (PostgreSQL)
# Replaces both MySQL (Auth) and MSSQL (DataOps)
DB_TYPE = os.getenv("DB_TYPE", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 5432))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "abvn1234")
DB_NAME = os.getenv("DB_NAME", "app_db")

# --- LEGACY MAPPINGS ---
# Maps old MSSQL/MySQL variables to the PostgreSQL instance for backward compatibility
SQL_HOST = os.getenv("SQL_HOST", DB_HOST)
SQL_PORT = os.getenv("SQL_PORT", str(DB_PORT))
SQL_USER = os.getenv("SQL_USER", DB_USER)
SQL_PASSWORD = os.getenv("SQL_PASSWORD", DB_PASS)
SQL_DATABASE = os.getenv("SQL_DATABASE", DB_NAME)

# Data Ops Specifics
SOURCE_DB = os.getenv("SOURCE_DB", "dataops")
MHDM_DB = os.getenv("MHDM_DB", "mhdm")