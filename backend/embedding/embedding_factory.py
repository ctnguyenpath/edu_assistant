import os
import ssl
import pathlib
from dotenv import load_dotenv

# --- 1. ROBUST ENV LOADING ---
try:
    env_path = pathlib.Path(__file__).resolve().parent.parent / '.env'
    if not env_path.exists():
        env_path = pathlib.Path(__file__).resolve().parent.parent.parent / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv() 

# Config
os.environ["TRANSFORMERS_OFFLINE"] = "1" 
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['PYTHONHTTPSVERIFY'] = '0'
ssl._create_default_https_context = ssl._create_unverified_context

def get_embedding_function():
    """
    Returns a tuple: (embed_function, vector_size)
    """
    provider = os.getenv("EMBEDDING_PROVIDER", "local").lower()
    
    # --- OPTION A: GOOGLE GEMINI (UPDATED) ---
    if provider == "gemini":
        from google import genai
        from google.genai import types
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("❌ GEMINI_API_KEY is missing in .env")

        client = genai.Client(api_key=api_key)
        model_name = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
        
        def embed_fn(text):
            # ✅ CORRECTED: Use RETRIEVAL_QUERY for the runtime chatbot
            response = client.models.embed_content(
                model=model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY" 
                )
            )
            return response.embeddings[0].values
            
        return embed_fn, int(os.getenv("GEMINI_VECTOR_SIZE", 768))
    
    # --- OPTION B: LOCAL ---
    else:
        from sentence_transformers import SentenceTransformer
        
        model_path = os.getenv("LOCAL_EMBEDDING_MODEL")
        if not model_path:
             model_path = "all-MiniLM-L6-v2"

        if not os.path.exists(model_path):
             # Fallback check for standard sentence-transformers cache
             pass 

        # Load with offline + local files enforcement
        encoder = SentenceTransformer(model_path, local_files_only=True)

        def embed_fn(text):
            return encoder.encode(text).tolist()
            
        return embed_fn, int(os.getenv("LOCAL_VECTOR_SIZE", 768))