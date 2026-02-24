import os
import sys
import pathlib
from qdrant_client import QdrantClient
from dotenv import load_dotenv

# Setup paths
current_file = pathlib.Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.append(str(project_root))
load_dotenv()

def list_collections():
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    client = QdrantClient(url=qdrant_url)
    
    try:
        response = client.get_collections()
        print(f"\n✅ Connected to Qdrant at {qdrant_url}")
        print(f"📊 Found {len(response.collections)} collections:\n")
        
        for collection in response.collections:
            print(f"  - {collection.name}")
            
        print("\n👉 Copy one of these names for your delete script.")
        
    except Exception as e:
        print(f"❌ Error connecting to Qdrant: {e}")

if __name__ == "__main__":
    list_collections()