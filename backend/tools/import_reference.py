import os
import pathlib
import pandas as pd
import numpy as np
import sys

# ✅ FIX: Robust Path Setup for imports
# Ensure we can import from backend root regardless of where this script runs
current_file = pathlib.Path(__file__).resolve()
project_root = current_file.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from pymongo import MongoClient
from dotenv import load_dotenv

# --- 1. ROBUST ENV LOADING ---
try:
    # Try looking up 3 levels (backend/rag_process/ -> root)
    env_path = project_root / '.env'
    if not env_path.exists():
         env_path = pathlib.Path(os.getcwd()) / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

print(f"📖 Loading environment from: {env_path}")
load_dotenv(dotenv_path=env_path)

# --- 2. CONFIGURATION ---
# MongoDB
MONGO_CONNECTION_STRING = os.getenv("MONGO_CONNECTION_STRING", "mongodb://root:abvn1234@localhost:27018/?authSource=admin")
# Handle Parlant URL injection if present
if "/parlant_sessions" in MONGO_CONNECTION_STRING:
    MONGO_URI = MONGO_CONNECTION_STRING.split("/parlant_sessions")[0] + "/?authSource=admin"
else:
    MONGO_URI = MONGO_CONNECTION_STRING


# Files
DEFAULT_FILE_PATH = fr"D:/data/ldc_data/input/Data_SKRRHD.xlsx"
LDC_FILE_PATH = os.getenv("LDC_FILE_PATH", DEFAULT_FILE_PATH)


DB_NAME = "ldc_bot"
COLLECTION_NAME = "risk_definitions" # New Collection for Master Data

def import_risk_definitions(LDC_FILE_PATH):
    print(f"📂 Reading Reference Data from: {LDC_FILE_PATH}")
    
    try:
        df = pd.read_excel(LDC_FILE_PATH, sheet_name='risk_code', dtype=str)
        
        # Normalize headers
        df.rename(columns={
            'Mã QTRR cấp 2': 'risk_code_lvl2', 'Tên mã QTRR cấp 2': 'risk_name_lvl2',
            'Mã QTRR cấp 3': 'risk_code_lvl3', 'Tên mã QTRR cấp 3': 'risk_name_lvl3',
            'Mã QTRR cấp 4': 'risk_code_lvl4', 'Tên mã QTRR cấp 4': 'risk_name_lvl4'
        }, inplace=True)

        client = MongoClient(MONGO_URI)
        col = client[DB_NAME][COLLECTION_NAME]
        col.delete_many({}) # Clear old data
        
        records = []
        seen_codes = set()

        for _, row in df.iterrows():
            l4_code = str(row.get('risk_code_lvl4', '')).strip()
            l4_name = str(row.get('risk_name_lvl4', '')).strip()
            
            if not l4_code or l4_code.lower() == 'nan' or not l4_name: continue
            if l4_code in seen_codes: continue
            
            seen_codes.add(l4_code)
            
            # Create structured record
            records.append({
                "type": "risk_master_data",
                # Level 4 (Target)
                "risk_code": l4_code,
                "risk_name": l4_name,
                "full_text": f"{l4_name} ({l4_code})",
                # Hierarchy for Filtering
                "lv2_code": str(row.get('risk_code_lvl2', '')).strip(),
                "lv2_name": str(row.get('risk_name_lvl2', '')).strip(),
                "lv3_code": str(row.get('risk_code_lvl3', '')).strip(),
                "lv3_name": str(row.get('risk_name_lvl3', '')).strip(),
            })

        if records:
            col.insert_many(records)
            print(f"✅ Imported {len(records)} risk definitions.")
        else:
            print("⚠️ No valid records found.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import_risk_definitions(LDC_FILE_PATH)