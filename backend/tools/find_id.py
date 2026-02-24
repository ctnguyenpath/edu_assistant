import os
import sys
import pathlib
from pymongo import MongoClient
from dotenv import load_dotenv

# Setup paths
current_file = pathlib.Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))
load_dotenv()

# Config
MONGO_URI = os.getenv("MONGO_CONNECTION_STRING", "mongodb://localhost:27017")
TARGET_DB = "ldc_bot" # Change if using a different DB name

def list_unconfirmed():
    client = MongoClient(MONGO_URI)
    db = client[TARGET_DB]
    
    print(f"\n🔍 Scanning Database: {TARGET_DB}")
    print(f"{'COLLECTION':<30} | {'STATUS':<15} | {'ID (Copy This)':<40} | {'CONTENT'}")
    print("-" * 120)

    collections = db.list_collection_names()
    found = False

    for col_name in collections:
        col = db[col_name]
        # Find items that are pending or classified (unconfirmed)
        cursor = col.find({
            "status": {"$in": ["pending", "classified", "pending_review"]}
        })

        for doc in cursor:
            found = True
            doc_id = str(doc["_id"])
            status = doc.get("status", "N/A")
            content = doc.get("search_content", "")[:30].replace("\n", " ")
            
            print(f"{col_name:<30} | {status:<15} | {doc_id:<40} | {content}")

    if not found:
        print("\n✅ No unconfirmed items found in this database.")
    else:
        print("\n💡 Copy the 'ID' and 'COLLECTION' to use in the delete script.")

if __name__ == "__main__":
    list_unconfirmed()