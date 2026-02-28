from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import text

# --- ABSOLUTE IMPORTS ---
# Ensures Uvicorn loader works stably inside the Docker container
from database import engine, check_db_health
from config import DB_NAME

# --- 1. INITIALIZE ROUTERS ---
system_router = APIRouter(prefix="/api/system", tags=["System"])
student_router = APIRouter(prefix="/api/student", tags=["Student"])

# --- MODELS ---
class ConnectionRequest(BaseModel):
    source_module_id: int
    target_module_id: int

# ==============================================================================
# 2. STUDENT & COURSE GRAPH ENDPOINTS
# ==============================================================================

@student_router.get("/{student_id}/performance")
async def get_student_performance(student_id: int):
    """Fetches student performance data from the cross-schema SQL View."""
    try:
        with engine.connect() as conn:
            query = text("SELECT * FROM student.module_performance WHERE student_id = :s_id")
            result = conn.execute(query, {"s_id": student_id})
            data = [dict(row._mapping) for row in result]
            return data if data else []
    except Exception as e:
        print(f"🔥 Router Error (Performance): {e}")
        raise HTTPException(status_code=500, detail=f"Database Query Failed: {str(e)}")

@student_router.get("/modules/{module_id}/prerequisites")
async def get_prerequisites(module_id: int):
    """Fetches the locked requirements for a specific module from the courses schema."""
    try:
        with engine.connect() as conn:
            # Join prerequisite rules to the master module list
            query = text("""
                SELECT m.module_id, m.topic_name, m.track 
                FROM courses.module_prerequisites mp
                JOIN courses.modules m ON mp.required_module_id = m.module_id
                WHERE mp.module_id = :m_id
            """)
            result = conn.execute(query, {"m_id": module_id})
            return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@student_router.post("/{student_id}/path/connect")
async def connect_modules(student_id: int, req: ConnectionRequest):
    """Saves the user's custom path connection into the student schema."""
    try:
        with engine.connect() as conn:
            query = text("""
                INSERT INTO student.user_path_connections 
                (student_id, source_module_id, target_module_id)
                VALUES (:s_id, :source, :target)
                ON CONFLICT DO NOTHING;
            """)
            conn.execute(query, {
                "s_id": student_id, 
                "source": req.source_module_id, 
                "target": req.target_module_id
            })
            conn.commit()
            return {"status": "connected", "source": req.source_module_id, "target": req.target_module_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@student_router.get("/{student_id}/path")
async def get_student_path(student_id: int):
    """Retrieves the complete custom Directed Acyclic Graph (DAG) the student has built."""
    try:
        with engine.connect() as conn:
            query = text("SELECT source_module_id, target_module_id FROM student.user_path_connections WHERE student_id = :s_id")
            result = conn.execute(query, {"s_id": student_id})
            return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# SYSTEM & HEALTH ENDPOINTS
# ==============================================================================

@system_router.get("/health")
async def health_check():
    """Returns the comprehensive status of all configured databases."""
    results = check_db_health()
    is_online = results.get("postgres", {}).get("ok", False)
    return {
        "status": "online" if is_online else "degraded",
        "database": DB_NAME,
        "details": results
    }

@system_router.get("/db-details")
def get_db_details():
    """Returns list of tables for the UI's DB management page across both schemas."""
    try:
        with engine.connect() as conn:
            # Updated to explicitly scan both your new schemas
            objs = conn.execute(text("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema IN ('courses', 'student', 'public')
                  AND table_type = 'BASE TABLE'
                ORDER BY table_schema, table_name
            """)).fetchall()
            
            return {
                "objects": [{"schema": row[0], "table": row[1], "status": "Active"} for row in objs]
            }
    except Exception as e:
        print(f"🔥 Router Error (DB Details): {e}")
        return {"error": str(e), "objects": []}

@system_router.get("/architecture")
def get_architecture():
    """Provides a high-level overview of the backend infrastructure."""
    return {
        "service": "Edu Data Ops API",
        "version": "2.1.0 (Modular & Multi-Schema)",
        "infrastructure": "Docker (WSL2 / Windows)",
        "databases": ["PostgreSQL", "MongoDB", "Qdrant"]
    }


# ==============================================================================
# 3. MAIN WRAPPER ROUTER (MUST BE AT THE BOTTOM)
# ==============================================================================
# By calling include_router down here, it registers all the endpoints defined above.
data_ops_router = APIRouter()
data_ops_router.include_router(system_router)
data_ops_router.include_router(student_router)