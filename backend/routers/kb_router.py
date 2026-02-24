from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Body, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict
from pydantic import BaseModel
import shutil
import os
import datetime
import uuid
import pandas as pd
import io

# Database Imports
try:
    from backend.database import mongo_client, qdrant_client, ldc_collection
    from backend.config import LDC_COLLECTION_NAME, EMBEDDING_PROVIDER
    
    # Import Manager Functions
    from backend.orm_service.rom_manager import (
        upload_raw_dataset,
        index_batch_to_qdrant,
        classify_batch,
        delete_risk_event,
        get_risk_definitions # ✅ IMPORTED POSTGRES HELPER
    )
except ImportError:
    # Fallback for local testing if running from root without backend prefix
    from database import mongo_client, qdrant_client, ldc_collection
    from config import LDC_COLLECTION_NAME, EMBEDDING_PROVIDER
    from orm_service.rom_manager import (
        upload_raw_dataset,
        index_batch_to_qdrant,
        classify_batch,
        delete_risk_event,
        get_risk_definitions
    )

# ✅ CHANGED PREFIX TO MATCH FRONTEND (was /api/kb)
kb_router = APIRouter(prefix="/api/rom", tags=["ROM Risk Classifier"])

# --- Request Models ---
class ResolutionRequest(BaseModel):
    record_id: str
    answer: Optional[str] = None
    risk_code: Optional[str] = None
    db_name: Optional[str] = None
    col_name: Optional[str] = None
    status: str = "active"
    feedback: Optional[str] = None
    user: Optional[str] = "reviewer"

class QuestionRequest(BaseModel):
    question: str
    user_id: Optional[str] = "web-admin"

class BatchActionRequest(BaseModel):
    batch_id: str
    db_name: str
    col_name: str
    qdrant_col: str
    provider: Optional[str] = "local"
    model_name: Optional[str] = None

class ExportRequest(BaseModel):
    ids: List[str]
    db_name: str
    col_name: str

# ==============================================================================
# 1. ROM PIPELINE ENDPOINTS
# ==============================================================================

@kb_router.get("/risk-definitions")
def api_get_risk_definitions():
    """
    Returns structured risk hierarchy from PostgreSQL (opsrisk.riskcode).
    Used for Frontend Dropdowns.
    """
    try:
        # ✅ Call the Postgres function from rom_manager
        data = get_risk_definitions()
        return data
    except Exception as e:
        print(f"Error fetching risk definitions: {e}")
        return []
    
@kb_router.get("/structure")
def get_system_structure():
    """Returns available Mongo Databases/Collections and Qdrant Collections."""
    structure = {"mongo": {}, "qdrant": []}
    try:
        dbs = mongo_client.list_database_names()
        for db in dbs:
            if db in ["admin", "local", "config"]: continue
            cols = mongo_client[db].list_collection_names()
            structure["mongo"][db] = cols
    except Exception as e: print(f"Mongo Error: {e}")
    
    try:
        q_cols = qdrant_client.get_collections()
        structure["qdrant"] = [c.name for c in q_cols.collections]
    except Exception as e: print(f"Qdrant Error: {e}")
    return structure

@kb_router.post("/upload") # Changed from upload-raw to upload to match JS
async def upload_raw(
    file: UploadFile = File(...), 
    db_name: str = Body(...),
    col_name: str = Body(...),
    dedup_keys: str = Body(default=""),
    uploader_id: str = Body(default="web-admin")
):
    """Stage 1: Upload Excel to MongoDB with Deduplication"""
    try:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        keys_list = [k.strip() for k in dedup_keys.split(",")] if dedup_keys else []
        
        result = upload_raw_dataset(temp_path, db_name, col_name, keys_list, uploader_id)
        
        if os.path.exists(temp_path): os.remove(temp_path)
        return result
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@kb_router.post("/vectorize")
def trigger_vectorize(payload: BatchActionRequest, background_tasks: BackgroundTasks):
    """Stage 2: MongoDB -> Qdrant"""
    background_tasks.add_task(index_batch_to_qdrant, payload.batch_id, payload.db_name, payload.col_name, payload.qdrant_col, payload.provider, payload.model_name)
    return {"status": "started", "message": "Vectorization started in background"}

@kb_router.post("/classify")
def trigger_classify(payload: BatchActionRequest, background_tasks: BackgroundTasks):
    """Stage 3: AI Classification"""
    background_tasks.add_task(classify_batch, payload.batch_id, payload.db_name, payload.col_name, payload.qdrant_col, payload.provider, payload.model_name)
    return {"status": "started", "message": "AI Classification started in background"}

# ==============================================================================
# 2. KNOWLEDGE BASE INBOX
# ==============================================================================

@kb_router.get("/stats")
def get_kb_stats():
    """Scans ALL collections in MongoDB and Qdrant for dashboard stats."""
    stats = {"mongodb": [], "qdrant": []}
    try:
        all_dbs = mongo_client.list_database_names()
        for db_name in all_dbs:
            if db_name in ["admin", "local", "config"]: continue
            db = mongo_client[db_name]
            for col_name in db.list_collection_names():
                try:
                    count = db[col_name].count_documents({})
                    stats["mongodb"].append({"database": db_name, "collection": col_name, "count": count})
                except: continue
    except Exception as e: stats["mongodb_error"] = str(e)

    try:
        response = qdrant_client.get_collections()
        for col in response.collections:
            info = qdrant_client.count(col.name, exact=True)
            stats["qdrant"].append({"collection": col.name, "count": info.count})
    except Exception as e: stats["qdrant_error"] = str(e)
    return stats

@kb_router.post("/add")
def manual_add_question(payload: QuestionRequest):
    """Manually adds a question to the inbox."""
    try:
        new_id = str(uuid.uuid4())
        doc = {
            "_id": new_id, "type": "user_query", "status": "pending",
            "search_content": payload.question, "response_content": None,
            "metadata": { "user_id": payload.user_id, "created_at": datetime.datetime.now().isoformat(), "source": "manual_add" }
        }
        ldc_collection.insert_one(doc)
        return {"status": "success", "id": new_id}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    
@kb_router.get("/pending")
def get_pending_questions(
    db_name: str = Query(None),
    col_name: str = Query(None),
    qdrant_col: str = Query(None)
):
    try:
        # ✅ WORKFLOW DEFAULT: If UI sends nothing, use LDC defaults
        if db_name and col_name:
            target_col = mongo_client[db_name][col_name]
            active_db = db_name
            active_col = col_name
        else:
            # Default to LDC Bot Raw Data
            active_db = "ldc_bot"
            active_col = "ldc_assistant_raw"
            target_col = mongo_client[active_db][active_col]

        if qdrant_col: active_q_col = qdrant_col
        else: active_q_col = "ldc_assistant_local"

        cursor = target_col.find(
            {
                "$or": [
                    {"status": "pending"}, {"status": "pending_review"}, 
                    {"status": "classified"}, {"status": "indexed"},
                    {"status": "active"}, {"status": "need_info"}, {"status": "error"}, {"status": "raw"}
                ]
            },
            {"_id": 1, "search_content": 1, "response_content": 1, "metadata": 1, "status": 1, "rag_matches": 1, "feedback": 1, "batch_id": 1}
        ).sort("metadata.imported_at", -1).limit(2000)
        
        results = []
        for doc in cursor:
            # ✅ Extract Metadata
            meta = doc.get("metadata", {})
            results.append({
                "id": str(doc["_id"]),
                "question": doc.get("search_content", "No text"),
                "response_content": doc.get("response_content"), 
                "rag_matches": doc.get("rag_matches", []),
                # ✅ Map fields correctly for UI
                "user": meta.get("uploader_id") or meta.get("user_id") or "Unknown",
                "file_id": meta.get("file_id") or doc.get("batch_id"),
                "raw_id": meta.get("row_id") or str(doc["_id"]),
                "source": meta.get("source"),
                "status": doc.get("status"),
                "feedback": doc.get("feedback"), 
                "date": meta.get("imported_at") or meta.get("created_at", ""),
                "report_date": meta.get("report_date", ""),
                "mongo_db": active_db, "mongo_col": active_col, "qdrant_col": active_q_col
            })
        return results
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@kb_router.post("/resolve")
def resolve_question(payload: ResolutionRequest):
    try:
        if payload.db_name and payload.col_name:
            target_col = mongo_client[payload.db_name][payload.col_name]
        else:
            target_col = ldc_collection

        update_data = {
            "status": payload.status, 
            "metadata.updated_at": datetime.datetime.now().isoformat()
        }
        if payload.answer: update_data["response_content"] = payload.answer
        if payload.risk_code: update_data["metadata.risk_code"] = payload.risk_code
        if payload.feedback: update_data["feedback"] = payload.feedback

        result = target_col.update_one({"_id": payload.record_id}, {"$set": update_data})
        
        if result.matched_count == 0: 
            from bson.objectid import ObjectId
            try:
                if ObjectId.is_valid(payload.record_id):
                    res2 = target_col.update_one({"_id": ObjectId(payload.record_id)}, {"$set": update_data})
                    if res2.matched_count > 0: return {"status": "success"}
            except: pass
            raise HTTPException(status_code=404, detail="Record not found")

        # Optional: Sync to Qdrant if status is active
        if payload.status == "active":
            # Default to local unless specified otherwise
            target_q_col = "ldc_assistant_local"
            try: qdrant_client.set_payload(collection_name=target_q_col, points=[payload.record_id], payload={"response_content": payload.answer, "status": "active"})
            except: pass
        
        return {"status": "success"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@kb_router.delete("/delete/{item_id}")
def api_delete_risk_event(item_id: str, db_name: str = Query(None), col_name: str = Query(None), qdrant_col: str = Query(None)):
    try:
        result = delete_risk_event(mongo_id=item_id, db_name=db_name, col_name=col_name, qdrant_col=qdrant_col)
        if result["status"] == "error": raise HTTPException(status_code=404, detail=result["message"])
        return result
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@kb_router.post("/export")
def export_selected_data(payload: ExportRequest):
    """Exports selected items to Excel using openpyxl."""
    try:
        if not payload.db_name or not payload.col_name:
             raise HTTPException(status_code=400, detail="Database and Collection names are required.")

        db = mongo_client[payload.db_name]
        col = db[payload.col_name]
        
        from bson.objectid import ObjectId
        query_ids = []
        for i in payload.ids:
            query_ids.append(i)
            if ObjectId.is_valid(i): query_ids.append(ObjectId(i))
            
        cursor = col.find({"_id": {"$in": query_ids}})
        data = []
        
        for doc in cursor:
            row = {
                "ID": str(doc["_id"]),
                "Date": doc.get("metadata", {}).get("report_date") or doc.get("metadata", {}).get("imported_at"),
                "Incident": doc.get("search_content"),
                "Branch": doc.get("metadata", {}).get("branch"),
                "Department": doc.get("metadata", {}).get("department"),
                "Risk Code": doc.get("metadata", {}).get("risk_code"),
                "AI Suggestion": doc.get("response_content"),
                "Status": doc.get("status"),
                "Feedback Note": doc.get("feedback", "")
            }
            data.append(row)

        if not data:
            raise HTTPException(status_code=404, detail="No records found to export")

        # Create Excel using openpyxl engine
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Risk Data')
        
        output.seek(0)
        
        filename = f"risk_export_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(
            output, 
            headers=headers, 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except Exception as e:
        print(f"Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))