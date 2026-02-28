import os
import sys
import pathlib
from pymongo import MongoClient
from qdrant_client import QdrantClient
from dotenv import load_dotenv

# --- NEW IMPORTS FOR POSTGRESQL ---
from sqlalchemy import create_engine, text, event

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

# ==============================================================================
# 2. POSTGRESQL CONNECTION (For Data Ops & Student Performance)
# ==============================================================================
DB_HOST = os.getenv("DB_HOST", "edu_postgres_db")
DB_PORT = os.getenv("DB_PORT", "5435")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "abvn1234")
DB_NAME = os.getenv("DB_NAME", "course_management")

DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

try:
    # This is the exact variable 'data_ops_router.py' is trying to import
    engine = create_engine(DB_URL, pool_pre_ping=True)

    # Automatically set the multi-schema search path whenever a connection is checked out
    @event.listens_for(engine, "connect")
    def set_search_path(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            # Grants access to both the 'courses' rules and 'student' data
            cursor.execute("SET search_path TO student, courses, public")
        except Exception as e:
            print(f"⚠️ Search Path Error: {e}")
        finally:
            cursor.close()

except Exception as e:
    print(f"❌ [DATABASE] Postgres Init Error: {e}")
    engine = None


# ==============================================================================
# 3. MONGODB CONNECTION (For Chatbot Sessions)
# ==============================================================================
# Try specific DOC connection first, then general, then fallback to localhost
mongo_uri = os.getenv("MONGO_CONNECTION_STRING_DOC")
if not mongo_uri:
    mongo_uri = os.getenv("MONGO_CONNECTION_STRING")
if not mongo_uri:
    mongo_uri = "mongodb://localhost:27017" # Fallback

# ==============================================================================
# 4. QDRANT CONNECTION (For Vector Embeddings)
# ==============================================================================
# Default to '127.0.0.1' instead of 'localhost' to avoid WinError 10061
q_host = os.getenv("QDRANT_HOST", "127.0.0.1") 
q_port = int(os.getenv("QDRANT_PORT", 6333))

# Sanitize host (remove inline comments if present in .env)
if "#" in q_host:
    q_host = q_host.split("#")[0].strip()

print(f"🔌 [DATABASE] Connecting to Qdrant at: {q_host}:{q_port}")

# Initialize NoSQL Clients
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

# --- Configuration Exports ---
LEGAL_COLLECTION_NAME = os.getenv("LEGAL_COLLECTION_NAME", "legal_assistant")
LDC_COLLECTION_NAME = os.getenv("LDC_COLLECTION_NAME", "ldc_assistant")


# ==============================================================================
# 5. HEALTH CHECK UTILITY (Required by main_data_ops.py)
# ==============================================================================
def check_db_health():
    """
    Pings all three databases (Postgres, Mongo, Qdrant) and returns their status.
    This feeds directly into the /api/system/health endpoint.
    """
    health = {
        "postgres": {"ok": False, "db": DB_NAME},
        "mongo": {"ok": False},
        "qdrant": {"ok": False}
    }

    # 1. Check Postgres
    if engine:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                health["postgres"]["ok"] = True
                
                # Check if the module_performance view successfully compiled
                view_check = conn.execute(text("SELECT to_regclass('student.module_performance')")).scalar()
                health["postgres"]["view"] = view_check is not None
        except Exception as e:
            health["postgres"]["error"] = str(e)
    else:
        health["postgres"]["error"] = "Engine not initialized"

    # 2. Check Mongo
    try:
        mongo_client.admin.command('ping')
        health["mongo"]["ok"] = True
    except Exception as e:
        health["mongo"]["error"] = str(e)

    # 3. Check Qdrant
    try:
        qdrant_client.get_collections()
        health["qdrant"]["ok"] = True
    except Exception as e:
        health["qdrant"]["error"] = str(e)

    return health