import sys
import pathlib
import os
import aiohttp
import asyncio
from dotenv import load_dotenv
from parlant.sdk import ToolContext, tool, ToolResult
from typing import Optional

# --- 0. PATH FIX ---
# Ensures we can import from backend modules regardless of where this script runs
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

# ✅ Import Service
try:
    from orm_service.ldc_classification.ldc_service import LDCService
except ImportError as e:
    print(f"❌ Import Error: {e}")
    try:
        from backend.orm_service.ldc_classification.ldc_service import LDCService
    except ImportError:
        LDCService = None

# --- 1. ROBUST ENV LOADING ---
try:
    env_path = pathlib.Path(__file__).resolve().parent.parent.parent / '.env'
    if not env_path.exists():
        env_path = pathlib.Path(os.getcwd()) / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

load_dotenv(dotenv_path=env_path)

# ✅ CONFIG: Url of the Upload Service (Where Frontend polls)
UPLOAD_SERVICE_URL = os.getenv("UPLOAD_SERVICE_INTERNAL_URL", "http://upload_service:8000")

# --- 2. SERVICE INITIALIZATION ---
_service = None
if LDCService:
    try:
        _service = LDCService()
        print("✅ [LDC Tools] Service initialized successfully.")
    except Exception as e:
        print(f"❌ [LDC Tools] Service Initialization Failed: {e}")
else:
    print("❌ [LDC Tools] LDCService class could not be imported.")

# Helper to force logs to show in Docker immediately
def log(msg):
    print(msg)
    sys.stdout.flush()

# ==============================================================================
# --- PROGRESS HELPER ---
# ==============================================================================

async def sync_progress_to_upload_service(file_id: str, current: int, total: int, status: str = "processing"):
    """
    Sends progress update to the Upload Service.
    Uses aiohttp to prevent blocking the main thread.
    """
    url = f"{UPLOAD_SERVICE_URL}/progress/update"
    payload = {
        "file_id": file_id,
        "current": current,
        "total": total,
        "status": status
    }
    try:
        # Use a short timeout
        timeout = aiohttp.ClientTimeout(total=2) 
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload) as response:
                # Critical: We must await read() or text() to ensure the connection is released
                # This prevents "Unclosed connection" warnings in logs
                await response.text() 
                
    except Exception as e:
        # Fail silently to avoid breaking the tool flow
        pass

# ==============================================================================
# --- TOOL DEFINITIONS ---
# ==============================================================================

@tool
async def submit_single_incident_tool(
    context: ToolContext, 
    description: str, 
    department: str, 
    branch: str, 
    occurred_at: str
) -> ToolResult:
    """
    Use this tool when a user reports a single operational risk or loss data event in the chat.
    This will process the event, run the AI classification, and return the prediction summary.
    
    Args:
        description: The detailed description of the incident.
        department: The department where it occurred.
        branch: The branch/location of the incident.
        occurred_at: The date of the incident (e.g., DD/MM/YYYY).
    """
    log(f"🛠️ [TOOL CALL] submit_single_incident_tool triggered.")
    
    if not _service:
        return ToolResult(data={"error": "LDC Service unavailable."})

    try:
        log(f"   📝 Submitting: {description[:30]}...")
        # 1. Process and save the incident via LDCService
        result = await _service.submit_single_incident(description, department, branch, occurred_at)
        incident_id = result.get("incident_id")
        
        # 2. Retrieve the fully enriched document from MongoDB
        doc = _service.raw_collection.find_one({"_id": incident_id})
        
        if not doc:
            return ToolResult(data={"message": f"Incident submitted. ID: {incident_id}. Ask the user to check the Review tab."})

        # 3. Extract the Top 1 Match and Prediction
        rag_matches = doc.get("rag_matches", [])
        primary_prediction = doc.get("response_content", "Unknown")
        primary_code = doc.get("metadata", {}).get("risk_code", "Unknown")
        
        top_score = 0
        if rag_matches and len(rag_matches) > 0:
            top_score = int(rag_matches[0].get("score", 0) * 100)

        # ✅ DYNAMIC NEXT ACTION BASED ON SCORE
        if top_score >= 80:
            next_action = 'Explicitly ask the user exactly this sentence: "Bạn có muốn báo cáo thêm sự cố nào khác không?"'
        else:
            next_action = f'Tell the user exactly: "Độ chính xác của hệ thống hiện tại là {top_score}%, khá thấp. Vui lòng cung cấp thêm chi tiết cụ thể hơn về sự cố để tôi có thể phân loại lại."'

        # 4. Return instructions to the Chatbot LLM (Vietnamese focused)
        summary = f"""
        ✅ Đã xử lý thành công và lưu tạm vào hàng đợi chờ duyệt.
        Mã sự cố (Incident ID): {incident_id}
        
        --- TÓM TẮT SỰ CỐ ---
        - Mô tả: {description}
        - Phòng ban: {department}
        - Chi nhánh: {branch}
        - Ngày xảy ra: {occurred_at}
        
        --- KẾT QUẢ PHÂN LOẠI AI ---
        - Tên rủi ro: {primary_prediction}
        - Mã rủi ro: {primary_code}
        - Độ chính xác (Matching Rate): {top_score}%
        
        INSTRUCTIONS FOR YOU (THE CHATBOT):
        1. Present the "TÓM TẮT SỰ CỐ" and "KẾT QUẢ PHÂN LOẠI AI" to the user using markdown bullet points.
        2. {next_action}
        3. Remember to output EVERYTHING in Vietnamese only.
        """
        return ToolResult(data={"message": summary})

    except Exception as e:
        log(f"   ❌ Error submitting incident: {e}")
        return ToolResult(data={"error": str(e)})


@tool
async def update_incident_details_tool(
    context: ToolContext, 
    incident_id: str, 
    additional_details: str
) -> ToolResult:
    """
    Use this tool when the user provides more details for an existing incident to re-classify it.
    """
    log(f"🛠️ [TOOL CALL] update_incident_details_tool triggered for ID: {incident_id}")
    
    if not _service:
        return ToolResult(data={"error": "LDC Service unavailable."})

    try:
        # ✅ CALLS THE NEW RECLASSIFY METHOD
        result = await _service.update_and_reclassify_incident(incident_id, additional_details)
        score_pct = int(result["new_score"] * 100)
        
        summary = f"""
        ✅ Đã cập nhật và phân loại lại sự cố.
        
        --- KẾT QUẢ PHÂN LOẠI LẠI AI ---
        - Tên rủi ro: {result['new_risk_name']}
        - Mã rủi ro: {result['new_risk_code']}
        - Độ chính xác mới (Matching Rate): {score_pct}%
        
        INSTRUCTIONS FOR YOU (THE CHATBOT):
        1. Tell the user exactly: "Cám ơn bạn đã cung cấp thêm dữ liệu, sự cố đã được phân loại lại thành công."
        2. Present the "KẾT QUẢ PHÂN LOẠI LẠI AI" to the user using markdown bullet points.
        3. Explicitly ask the user exactly this sentence: "Bạn có muốn báo cáo thêm sự cố nào khác không?"
        4. Remember to output EVERYTHING in Vietnamese only.
        """
        return ToolResult(data={"message": summary})
        
    except Exception as e:
        log(f"   ❌ Error updating incident: {e}")
        return ToolResult(data={"error": str(e)})


@tool
async def update_incident_status_tool(
    context: ToolContext,
    incident_id: str,
    status: str = "active",
    confirmed_risk_name: Optional[str] = None,
    confirmed_risk_code: Optional[str] = None
) -> ToolResult:
    """
    Use this tool to officially confirm or update the status of a reported incident in the database.
    """
    if not _service:
        return ToolResult(data={"error": "Service unavailable"})
        
    try:
        update_data = {"status": status}
        if confirmed_risk_code:
            update_data["metadata.risk_code"] = confirmed_risk_code
        if confirmed_risk_name:
            update_data["response_content"] = confirmed_risk_name
            
        _service.raw_collection.update_one({"_id": incident_id}, {"$set": update_data})
        _service.incident_db.incidents.update_one({"incident_id": incident_id}, {"$set": update_data})
        
        return ToolResult(data={"status": "success", "message": "Incident officially confirmed and activated in the database."})
    except Exception as e:
        return ToolResult(data={"error": str(e)})


# ✅ NEW: Check Latest Upload Tool
@tool
async def check_latest_upload_tool(context: ToolContext) -> ToolResult:
    """
    Checks the database for the most recent file uploaded by the current user.
    """
    if not _service: return ToolResult(data={"error": "Service unavailable"})
    return ToolResult(data=await _service.get_latest_upload(context.session_id))


# ✅ UPDATED: Analyze Tool (With Smart Fallback & Sanitization)
@tool
async def analyze_uploaded_file_tool(
    context: ToolContext, 
    file_id: str = ""  # 👈 Optional argument to prevent crashing
) -> ToolResult:
    """
    Analyzes an uploaded Excel file. 
    If file_id is missing, it automatically finds the latest file for this user.
    """
    log(f"\n==========================================")
    log(f"🛠️ [TOOL CALL] analyze_uploaded_file_tool | Input ID: '{file_id}'")
    log(f"==========================================\n")

    if not _service:
        return ToolResult(data={"error": "LDC Service unavailable."})

    # 1. SMART LOOKUP: If no ID provided, find the latest one
    if not file_id or file_id.strip() == "":
        log(f"   ⚠️ No File ID provided by AI. Searching database for latest upload...")
        latest = await _service.get_latest_upload(context.session_id)
        
        if latest.get("found"):
            file_id = latest["file_id"]
            filename = latest.get("filename", "Unknown")
            log(f"   🔎 Found latest file: {filename} ({file_id})")
        else:
            log(f"   ❌ No recent files found for session {context.session_id}")
            return ToolResult(data={
                "error": "not_found", 
                "message": "Không tìm thấy file nào trong lịch sử. Vui lòng upload lại."
            })

    # 2. Proceed with Analysis
    try:
        log(f"   🚀 Starting Analysis for: {file_id}")
        
        async def progress_callback(current, total):
            await sync_progress_to_upload_service(file_id, current, total, "processing")

        result = await _service.process_uploaded_file(file_id, progress_callback=progress_callback)
        
        await sync_progress_to_upload_service(file_id, 100, 100, "completed")
        log(f"   ✅ Processing Complete.")
        
        # ✅ SANITIZE RESULT (Critical Fix)
        # Ensure no 'None' values are returned to the AI
        safe_result = {
            "status": result.get("status", "unknown"),
            "file_id": file_id, # 👈 Added file_id for the agent
            "success_rows": result.get("success_rows", 0),
            "error_rows": result.get("error_rows", 0),
            "report_url": result.get("report_url") or "",  # Convert None to ""
            # ✅ ADDED: Pass the error text summary to the Agent
            "error_details": result.get("error_details") or "", 
            "message": result.get("message", "")
        }
        
        log(f"   📦 Sending Result to Agent: {safe_result}")
        return ToolResult(data=safe_result)

    except Exception as e:
        log(f"   ❌ FATAL ERROR in analyze_uploaded_file_tool: {e}")
        await sync_progress_to_upload_service(file_id, 0, 0, "failed")
        return ToolResult(data={"error": str(e)})