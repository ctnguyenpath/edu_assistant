from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.data_ops_router import data_ops_router

app = FastAPI(title="Data Ops API (Stub)")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTERS ---
app.include_router(data_ops_router)

@app.get("/")
def health_check():
    return {"status": "online", "service": "data_ops_stub"}