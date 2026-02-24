import sys
import os
import pathlib
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text 

# --- 1. SETUP PATHS ---
current_file = pathlib.Path(__file__).resolve()
project_root = current_file.parent.parent  
sys.path.append(str(project_root))

# --- 2. DATABASE CONFIGURATION ---
# Centralizing engine creation so it can be used by routes
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "abvn1234")
DB_HOST = os.getenv("DB_HOST", "edu_postgres_db")
DB_PORT = os.getenv("DB_PORT", "5435")
DB_NAME = os.getenv("DB_NAME", "course_management") # Updated to match your init script

DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DB_URL)

# --- 3. IMPORT ROUTERS ---
try:
    from backend.routers.kb_router import kb_router
except ImportError:
    try:
        from routers.kb_router import kb_router
    except ImportError:
        kb_router = None

# --- 4. LIFESPAN ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🔄 Checking Connection to {DB_NAME}...")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"✅ Database '{DB_NAME}' Connected Successfully")
    except Exception as e:
        print(f"❌ Database Connection FAILED: {e}")
    yield
    print("🛑 Shutting down Edu App Data Service...")

# --- 5. CREATE APP ---
app = FastAPI(title="Edu App Data Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. ROUTES ---

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Edu App Data Service is running smoothly!"}

# NEW: Route to fetch student performance from the SQL View
@app.get("/api/student/{student_id}/performance")
async def get_student_performance(student_id: int):
    try:
        with engine.connect() as conn:
            # Query the view we created in 01_init_schema.sql
            query = text("SELECT * FROM student.module_performance WHERE student_id = :s_id")
            result = conn.execute(query, {"s_id": student_id})
            
            # Convert results to a list of dictionaries
            data = [dict(row._mapping) for row in result]
            return data
    except Exception as e:
        print(f"Error fetching performance: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

if kb_router:
    app.include_router(kb_router)

# --- 7. RUN SERVER ---
if __name__ == "__main__":
    SYSTEM_PORT = 8801
    print(f"🚀 [EDU DATA OPS] Starting on http://0.0.0.0:{SYSTEM_PORT}")
    uvicorn.run("main_data_ops:app", host="0.0.0.0", port=SYSTEM_PORT, reload=True)