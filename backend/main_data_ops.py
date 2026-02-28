import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- ABSOLUTE IMPORTS ---
# Ensures Uvicorn loader works stably inside the Docker container
from database import engine, check_db_health
from config import DB_NAME, DB_PORT
from routers.data_ops_router import data_ops_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup validation and shutdown for all data services."""
    print(f"🔄 Booting Edu Data Ops (Target DB: {DB_NAME} on Port: {DB_PORT})")
    
    # 1. Run comprehensive health checks for Postgres, Mongo, and Qdrant
    health = check_db_health()
    pg_status = health.get("postgres", {})

    # 2. Log PostgreSQL & View status
    if pg_status.get("ok"):
        print(f"✅ Connected to PostgreSQL: {pg_status.get('db')}")
        if pg_status.get("view"):
            print("✅ View 'student.module_performance' is READY.")
        else:
            print(f"⚠️ WARNING: View 'student.module_performance' MISSING in '{pg_status.get('db')}'")
    else:
        error_msg = pg_status.get("error", "Unknown Connection Error")
        print(f"❌ POSTGRES CONNECTION FAILED: {error_msg}")
        print(f"💡 TIP: Verify 'edu_postgres_db' is up and using port 5435.")

    # 3. Log secondary database statuses
    if health.get("mongo", {}).get("ok"):
        print("✅ Connected to MongoDB")
    else:
        print(f"⚠️ MongoDB degraded: {health.get('mongo', {}).get('error', 'Unknown')}")
        
    if health.get("qdrant", {}).get("ok"):
        print("✅ Connected to Qdrant")
    else:
        print(f"⚠️ Qdrant degraded: {health.get('qdrant', {}).get('error', 'Unknown')}")
        
    yield
    print("🛑 Shutting down Edu App Data Service...")

# Initialize FastAPI with the lifespan manager
app = FastAPI(title="Edu App Data Service", lifespan=lifespan)

# --- MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTER INCLUSION ---
# Prefix is omitted here because it is defined directly inside data_ops_router.py
app.include_router(data_ops_router)

# --- ROOT ENDPOINT ---
@app.get("/")
async def root():
    """Simple root check to verify the service is responding to HTTP requests."""
    return {
        "message": "Edu Data Ops API is active",
        "docs": "/docs",
        "health": "/api/system/health"
    }

if __name__ == "__main__":
    # Ensure uvicorn uses the string reference for stable reloading
    # reload_delay 0.5 is critical for Windows 11 I/O stability
    uvicorn.run(
        "main_data_ops:app", 
        host="0.0.0.0", 
        port=8801, 
        reload=True, 
        reload_delay=0.5
    )