import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
from dotenv import load_dotenv

# 1. Load environment variables
load_dotenv()

app = FastAPI()

# --- CONFIGURATION ---
DB_HOST = os.getenv("DB_HOST", "localhost") 
DB_USER = os.getenv("DB_USER", "postgres") # Updated default
DB_PASS = os.getenv("DB_PASS", "abvn1234")
DB_NAME = os.getenv("DB_NAME", "app_db")
DB_PORT = int(os.getenv("DB_PORT", 5432)) # Postgres default

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST MODELS ---
class LoginRequest(BaseModel):
    email: str
    password: str

# NEW: Model for Registration
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    department: str = None # Optional
    access_rights: str = "rrtt" # Default rights

class UpdateSessionRequest(BaseModel):
    user_id: int
    session_id: str

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        port=DB_PORT
    )

# --- ROUTES ---

# 1. REGISTER (New Endpoint)
@app.post("/auth/register", status_code=201)
async def register(request: RegisterRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        # Use RealDictCursor to get dictionary-like results
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Check if email exists (Targeting 'user_management' schema)
        cursor.execute("SELECT id FROM user_management.users WHERE email = %s", (request.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash Password
        # bcrypt.hashpw requires bytes, insert requires string for Postgres
        hashed_bytes = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt())
        hashed_str = hashed_bytes.decode('utf-8')

        # Insert User
        query = """
            INSERT INTO user_management.users 
            (email, full_name, department, access_rights, password_hash) 
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (request.email, request.full_name, request.department, request.access_rights, hashed_str))
        conn.commit()

        return {"message": "User created successfully", "success": True}

    except psycopg2.Error as err:
        print(f"DB Error: {err}")
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail="Database connection error")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 2. LOGIN
@app.post("/auth/login")
async def login(request: LoginRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT * FROM user_management.users WHERE email = %s", (request.email,))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify Password
        stored_hash = user['password_hash']
        # Ensure stored hash is bytes for bcrypt check
        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode('utf-8')

        if not bcrypt.checkpw(request.password.encode('utf-8'), stored_hash):
             raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "success": True,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user['full_name'],
                "department": user.get('department'),
                "access_rights": user.get('access_rights'),
                "parlant_session_id": user.get('parlant_session_id') 
            }
        }

    except psycopg2.Error as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 3. UPDATE SESSION
@app.post("/auth/update_session")
async def update_session(request: UpdateSessionRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "UPDATE user_management.users SET parlant_session_id = %s WHERE id = %s"
        cursor.execute(query, (request.session_id, request.user_id))
        conn.commit()
        
        return {"success": True}
    except psycopg2.Error as e:
        print(f"DB Update Error: {e}")
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

if __name__ == "__main__":
    import uvicorn
    # Runs the Auth Server on Port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)