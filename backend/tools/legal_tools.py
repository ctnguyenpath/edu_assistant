import sys
import pathlib
import os

# --- 0. PATH FIX ---
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

from google import genai
from google.genai import types
from sentence_transformers import SentenceTransformer
from parlant.sdk import ToolContext, tool, ToolResult
from dotenv import load_dotenv

# Import from parent directory
from database import qdrant_client
from config import (
    LEGAL_COLLECTION_NAME,
    GEMINI_API_KEY, 
    LDC_COLLECTION_NAME, 
    EMBEDDING_PROVIDER, 
    GEMINI_EMBEDDING_MODEL,
    LOCAL_EMBEDDING_MODEL
)

# --- 1. ROBUST ENV LOADING ---
try:
    env_path = pathlib.Path(__file__).resolve().parent.parent.parent / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

load_dotenv(dotenv_path=env_path)

# --- 2. CONFIGURATION & INITIALIZATION ---
PROVIDER = os.getenv("EMBEDDING_PROVIDER", "local").lower()
print(f"🧠 [Legal Tool] Loading Embedding Provider: {PROVIDER.upper()}")

gemini_client = None
local_model = None

if PROVIDER == "gemini":
    if not GEMINI_API_KEY:
        print("⚠️ GEMINI_API_KEY missing. Falling back to LOCAL provider.")
        PROVIDER = "local"
    else:
        try:
            gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        except Exception as e:
            print(f"❌ Failed to init Gemini Client: {e}")
            PROVIDER = "local"

if PROVIDER == "local":
    model_source = LOCAL_EMBEDDING_MODEL if os.path.exists(LOCAL_EMBEDDING_MODEL) else "keepitreal/vietnamese-sbert"
    print(f"   🔹 Loading Local Model from: {model_source}")
    try:
        local_model = SentenceTransformer(model_source)
    except Exception as e:
        print(f"❌ Failed to load local model: {e}")

# --- 3. HELPER FUNCTION: Get Embedding ---
def get_query_embedding(text: str):
    """Generates embedding based on the selected PROVIDER in config."""
    try:
        if PROVIDER == "gemini" and gemini_client:
            response = gemini_client.models.embed_content(
                model=GEMINI_EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
            )
            return response.embeddings[0].values
        elif local_model:
            return local_model.encode(text).tolist()
        else:
            print("❌ No embedding model available.")
            return []
    except Exception as e:
        print(f"❌ Embedding Error: {e}")
        return []

# ==============================================================================
# ✅ CORE LOGIC (Shared)
# ==============================================================================

def execute_qdrant_search(collection_name, vector, limit):
    """Helper to handle Qdrant version differences."""
    try:
        return qdrant_client.search(
            collection_name=collection_name,
            query_vector=vector,
            limit=limit
        )
    except AttributeError:
        try:
            result = qdrant_client.query_points(
                collection_name=collection_name,
                query=vector,
                limit=limit
            )
            return result.points
        except Exception as inner_e:
            print(f"❌ Qdrant Query Fallback Error: {inner_e}")
            return []
    except Exception as e:
        print(f"❌ Qdrant Search Error: {e}")
        return []

def find_similar_risks(incident_description: str, limit: int = 5):
    """Core logic to find similar risk incidents."""
    if not qdrant_client:
        print("❌ Database connection missing.")
        return []

    query_vector = get_query_embedding(incident_description)
    if not query_vector:
        print("❌ Failed to generate vector.")
        return []

    return execute_qdrant_search(LDC_COLLECTION_NAME, query_vector, limit)

# ==============================================================================
# --- TOOL DEFINITIONS (PARLANT 3.1) ---
# ==============================================================================

@tool
async def search_legal_knowledge(context: ToolContext, query: str) -> ToolResult:
    """
    Searches the vector database for laws, decrees, circulars, or regulations.
    
    Parameters:
    - query: The user's question or keywords about the legal document.
    """
    if not qdrant_client:
        return ToolResult(data="Error: Database connection is not available.")

    print(f"🔍 [Legal Tool] User asked: '{query}'")
    
    try:
        query_vector = get_query_embedding(query)
        if not query_vector:
            return ToolResult(data="Error: Failed to generate embedding.")

        search_hits = execute_qdrant_search(LEGAL_COLLECTION_NAME, query_vector, 4)

        if not search_hits:
            return ToolResult(data="No relevant legal documents found.")

        results_text = "FOUND RELEVANT LEGAL ARTICLES:\n\n"
        for hit in search_hits:
            payload = hit.payload
            article_num = payload.get('article_number', payload.get('Article', 'N/A'))
            title = payload.get('title', payload.get('Title', 'Untitled'))
            content = payload.get('content', payload.get('Content', ''))
            
            results_text += f"=== Article {article_num}: {title} ===\n{content}\n-----------------\n"

        return ToolResult(data=results_text)

    except Exception as e:
        print(f"❌ Error during legal search: {e}")
        return ToolResult(data=f"Error: {str(e)}")

@tool
async def classify_incident_risk(context: ToolContext, incident_description: str) -> ToolResult:
    """
    Classifies an operational risk incident based on historical data.
    
    Parameters:
    - incident_description: A detailed description of the operational error or loss event.
    """
    print(f"🔍 [Risk Tool] Classifying: '{incident_description}'")
    
    hits = find_similar_risks(incident_description, limit=1)

    if not hits:
        return ToolResult(data="Could not classify. No similar records found.")

    top_hit = hits[0]
    payload = top_hit.payload
    score = top_hit.score
    
    risk_name = payload.get('risk_name_lvl4')
    risk_code = payload.get('risk_code_lvl4')

    return ToolResult(data=f"Risk: {risk_name}\nCode: {risk_code}\n(Confidence: {score:.2f})")