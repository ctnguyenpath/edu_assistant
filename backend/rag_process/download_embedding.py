import os
import pathlib
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# --- 1. ROBUST ENV LOADING ---
try:
    env_path = pathlib.Path(__file__).resolve().parent.parent.parent / '.env'
    if not env_path.exists():
         env_path = pathlib.Path(os.getcwd()) / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

load_dotenv(dotenv_path=env_path)

# --- 2. CONFIGURATION ---
# Use the path defined in .env or default to the structure provided
SAVE_PATH = os.getenv("LOCAL_EMBEDDING_MODEL", "E:/llm_data/models/vietnamese-sbert")
MODEL_NAME = "keepitreal/vietnamese-sbert"

def main():
    print(f"⏳ Starting download for model: {MODEL_NAME}")
    print(f"📂 Destination: {os.path.abspath(SAVE_PATH)}")

    # Create directory if not exists
    if not os.path.exists(SAVE_PATH):
        os.makedirs(SAVE_PATH)

    # Download and Save
    model = SentenceTransformer(MODEL_NAME)
    model.save(SAVE_PATH)

    print(f"✅ Model downloaded and saved successfully to: {SAVE_PATH}")
    print("👉 You can now run the RAG scripts using 'EMBEDDING_PROVIDER=local'.")

if __name__ == "__main__":
    main()