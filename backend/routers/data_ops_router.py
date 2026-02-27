from fastapi import APIRouter

# --- ROUTERS ---
# We keep these router definitions in case they are imported by the main app
# to prevent ImportErrors, but they will be empty.
system_router = APIRouter(prefix="/api/system", tags=["System"])
analysis_router = APIRouter(prefix="/api/analysis", tags=["Analysis"])
mapping_router = APIRouter(prefix="/api/mapping", tags=["Mapping"])
manual_sub = APIRouter(prefix="/api/manual", tags=["Manual Ops"])
daily_sub = APIRouter(prefix="/api/daily", tags=["Daily Ops"])
student_router = APIRouter(prefix="/api/student", tags=["Student"])

# --- DUMMY ENDPOINTS ---
@student_router.get("/{student_id}/performance")
def get_student_performance(student_id: str):
    # Frontend expects an array of module performance records
    return [
        {
            "module_id": i, 
            "score": 0, 
            "status": "active" if i == 1 else "locked", 
            "progress": 0
        }
        for i in range(1, 20)
    ]

# Main Wrapper Router
data_ops_router = APIRouter()
data_ops_router.include_router(system_router)
data_ops_router.include_router(analysis_router)
data_ops_router.include_router(mapping_router)
data_ops_router.include_router(daily_sub)
data_ops_router.include_router(manual_sub)
data_ops_router.include_router(student_router)