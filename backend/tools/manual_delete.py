import os
import sys
import pathlib
from pymongo import MongoClient
from qdrant_client import QdrantClient, models
from dotenv import load_dotenv
from bson.objectid import ObjectId

# Setup paths
current_file = pathlib.Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))
load_dotenv()

# --- 📝 CONFIGURATION (PASTE YOUR ID HERE) ---
# Run 'backend/tools/find_ids.py' first to get this ID!
TARGET_ID = "c64f3b3a-62e4-4d6b-ad63-ce01c100e43f" 

TARGET_DB = "ldc_bot"
TARGET_MONGO_COL = "ldc_assistant_raw" # Use 'ldc_assistant_raw' or 'ldc_assistant' depending on where the item is
# ✅ CORRECTED COLLECTION NAME
QDRANT_COLLECTION = "ldc_assistant_local" 
# ---------------------------------------------

def force_delete():
    print(f"🔥 Starting force delete for ID: {TARGET_ID}...")

    # 1. MongoDB Deletion
    try:
        mongo = MongoClient(os.getenv("MONGO_CONNECTION_STRING", "mongodb://localhost:27017"))
        db = mongo[TARGET_DB]
        col = db[TARGET_MONGO_COL]

        # Try deleting as String (UUID)
        query = {"_id": TARGET_ID}
        # Fallback to ObjectId if needed
        if not col.find_one(query):
            try:
                query = {"_id": ObjectId(TARGET_ID)}
            except: pass

        res = col.delete_one(query)
        if res.deleted_count > 0:
            print(f"✅ MongoDB: Deleted document from {TARGET_MONGO_COL}")
        else:
            print(f"⚠️ MongoDB: Document not found in {TARGET_MONGO_COL}. (It might already be gone, or check TARGET_MONGO_COL)")

    except Exception as e:
        print(f"❌ MongoDB Error: {e}")

    # 2. Qdrant Deletion
    try:
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant = QdrantClient(url=qdrant_url)
        
        # Verify collection exists first
        collections = [c.name for c in qdrant.get_collections().collections]
        if QDRANT_COLLECTION not in collections:
            print(f"❌ Qdrant Error: Collection '{QDRANT_COLLECTION}' not found! Available: {collections}")
            return

        # Delete by Filter
        operation = qdrant.delete(
            collection_name=QDRANT_COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="mongo_id",
                            match=models.MatchValue(value=TARGET_ID)
                        )
                    ]
                )
            )
        )
        print(f"✅ Qdrant: Delete request sent to '{QDRANT_COLLECTION}'. Response: {operation}")

    except Exception as e:
        print(f"❌ Qdrant Error: {e}")

if __name__ == "__main__":
    if TARGET_ID == "PASTE_THE_ID_FROM_FIND_IDS_HERE":
        print("❌ Error: You must paste a valid ID into 'TARGET_ID' at the top of the script first!")
    else:
        force_delete()