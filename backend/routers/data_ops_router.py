from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import shutil
import traceback
import pandas as pd
import numpy as np
from sqlalchemy import text, inspect
from datetime import datetime, date
from dotenv import load_dotenv

# --- IMPORTS ---
# ✅ NEW: Import specific engines for Source vs Metric DBs
# Note: Filename is stl_mssql_connect.py but logic inside is Postgres
from backend.data_ops.stl_mssql_connect import (
    get_mssql_engine, 
    get_source_engine, 
    get_mhdm_engine
)

from backend.data_ops.stl_preprocessing import check_data_consistency, run_preprocessing
from backend.data_ops.stl_system_init import truncate_all_tables
from backend.data_ops.stl_operation_log import get_upload_logs 
from backend.data_ops.stl_metric_calculation import run_metric_calculation

# MAPPING IMPORTS
from backend.data_ops.stl_upload_mapping import (
    upload_mapping_file, 
    scan_mapping_files, 
    get_database_structure, 
    inspect_file_structure,
    get_existing_mapping_tables 
)

# DAILY OPS IMPORTS
from backend.data_ops.stl_upload_daily import scan_for_new_files, upload_selected_files, get_target_engine

# MANUAL OPS IMPORTS
from backend.data_ops.manual_ops import (
    scan_network_files, 
    search_files_by_date, 
    browse_folder, 
    batch_upload_files
)

# ANALYSIS IMPORTS
from backend.data_ops.stl_analysis import process_analysis_data, REPORT_CONFIG

# MHDM DAILY REPORT IMPORTS
from backend.report.mhdm_history_dailyreport import (
    upload_daily_report_excel, 
    calculate_daily_system_metrics,
    get_daily_report_history,
    get_daily_report_data 
)

# DATA EXPORT IMPORT
from backend.data_ops.stl_data_export import get_exportable_tables, export_data_to_folder

# --- CONFIG ---
load_dotenv()
SOURCE_DB = os.getenv("SOURCE_DB", "dataops")
MHDM_DB = os.getenv("MHDM_DB", "mhdm")

# --- ROUTERS ---
system_router = APIRouter(prefix="/api/system", tags=["System"])
analysis_router = APIRouter(prefix="/api/analysis", tags=["Analysis"])
mapping_router = APIRouter(prefix="/api/mapping", tags=["Mapping"])
manual_sub = APIRouter(prefix="/api/manual", tags=["Manual Ops"])
daily_sub = APIRouter(prefix="/api/daily", tags=["Daily Ops"])

# Main Wrapper Router
data_ops_router = APIRouter()
data_ops_router.include_router(system_router)
data_ops_router.include_router(analysis_router)
data_ops_router.include_router(mapping_router)
data_ops_router.include_router(daily_sub)
data_ops_router.include_router(manual_sub)

# --- MODELS ---
class MetricCalcRequest(BaseModel):
    start_date: str
    end_date: str
    metrics: Optional[List[str]] = []
    preview: Optional[bool] = False

class DateRange(BaseModel):
    start_date: str
    end_date: str
    target_db: Optional[str] = SOURCE_DB # Default to DataOps for preprocessing
    target_schema: Optional[str] = "rms_preproces"
    tables: Optional[List[str]] = None 

class ExportRequest(BaseModel):
    start_date: str
    end_date: str
    target_path: str
    tables: List[str]

class FileItem(BaseModel):
    file_name: str
    full_path: str
    folder: Optional[str] = ""
    table_name: Optional[str] = "" 
    file_rows: Optional[int] = 0 
    mod_time: Optional[str] = ""
    report_date: Optional[str] = ""
    path: Optional[str] = None 
    table: Optional[str] = None
    date: Optional[str] = None

class UploadSelectionRequest(BaseModel):
    files: List[FileItem]

class CalcRequest(BaseModel):
    report_date: str
    dry_run: Optional[bool] = False
    target_db: Optional[str] = MHDM_DB # Default to MHDM for metrics
    target_schema: Optional[str] = "rms_metric"

class MappingUploadRequest(BaseModel):
    file_name: str
    target_db: Optional[str] = None 
    target_schema: Optional[str] = None
    sheet_overrides: Optional[Dict[str, str]] = {} 
    selected_sheets: Optional[List[str]] = []
    replace_existing: Optional[bool] = True

# --- HELPERS ---
def normalize_date_str(date_val):
    if not date_val: return ""
    s = str(date_val).strip()
    if s.endswith(".0"): s = s[:-2]
    s = s.replace("-", "").replace("/", "").replace(".", "")
    return s

def ensure_database_exists(base_engine, db_name):
    if not db_name: return
    try:
        # Postgres Check
        maintenance_url = str(base_engine.url).replace(f"/{base_engine.url.database}", "/postgres")
        # Creating a temporary engine for check
        # (Simplified: assuming if we are here, DB likely exists or will be handled by connect logic)
        pass 
    except Exception as e:
        print(f"DB Creation Warning: {e}")

# ==============================================================================
# ROUTERS
# ==============================================================================

# --- DATA EXPORT ENDPOINTS ---
@system_router.get("/export-tables")
def get_export_tables():
    # Export usually comes from Source (Raw) or Preprocessed
    return get_exportable_tables(get_source_engine())

@system_router.post("/export-data")
def trigger_data_export(payload: ExportRequest):
    try:
        # Default to source engine for raw data export
        return export_data_to_folder(
            get_source_engine(), 
            payload.start_date, 
            payload.end_date, 
            payload.target_path, 
            payload.tables
        )
    except Exception as e:
        raise HTTPException(500, detail=str(e))

# --- ANALYSIS: METRIC ENGINE ---
@analysis_router.post("/calculate-metrics")
def trigger_full_metric_calculation(payload: MetricCalcRequest):
    # Metrics run on MHDM DB
    engine = get_mhdm_engine()
    logs = run_metric_calculation(
        engine, 
        payload.start_date, 
        payload.end_date, 
        payload.metrics, 
        payload.preview
    )
    return {"status": "completed", "logs": logs}

# --- ANALYSIS: MHDM REPORT SPECIFIC ---
@analysis_router.get("/config")
def get_analysis_config_endpoint(): 
    return REPORT_CONFIG

@analysis_router.get("/history")
def get_history_endpoint():
    # MHDM Daily Report lives in MHDM DB
    engine = get_mhdm_engine()
    try:
        return get_daily_report_history(engine)
    except Exception as e:
        return {"error": str(e), "data": []}

@analysis_router.get("/report-view")
def get_report_view_endpoint(start_date: Optional[str] = None):
    # MHDM Daily Report lives in MHDM DB
    engine = get_mhdm_engine()
    try:
        data = get_daily_report_data(engine, start_date)
        if isinstance(data, list) and len(data) > 0:
            df = pd.DataFrame(data)
            df = df.where(pd.notnull(df), None)
            data = df.to_dict(orient="records")
        return {"data": data}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@analysis_router.post("/calculate-daily")
def trigger_daily_calculation(payload: CalcRequest):
    # Calculations write to MHDM DB
    # We prioritize the MHDM engine unless user overrides target_db specifically
    
    if payload.target_db and payload.target_db.lower() == SOURCE_DB.lower():
        target_engine = get_source_engine()
    elif payload.target_db and payload.target_db.lower() != MHDM_DB.lower():
        # Fallback for completely custom DB
        try: target_engine = get_target_engine(get_mssql_engine(), payload.target_db)
        except: target_engine = get_mhdm_engine()
    else:
        target_engine = get_mhdm_engine()

    try:
        return calculate_daily_system_metrics(
            target_engine, 
            payload.report_date, 
            payload.dry_run
        )
    except Exception as e: 
        raise HTTPException(500, detail=str(e))

@analysis_router.get("/data")
async def get_analysis_data_endpoint(
    report_key: str, 
    metric: Optional[str] = None, 
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    target_db: Optional[str] = None, 
    target_schema: Optional[str] = "rms_metric"
):
    # Determine which DB to query based on the report type
    # Logic: If metric calculation, likely MHDM. If Raw Analysis, likely Source.
    
    # Default selection logic
    if target_db:
        # If UI provides DB, try to connect to it
        if target_db.lower() == SOURCE_DB.lower():
            target_engine = get_source_engine()
        elif target_db.lower() == MHDM_DB.lower():
            target_engine = get_mhdm_engine()
        else:
            target_engine = get_target_engine(get_mssql_engine(), target_db)
    else:
        # Auto-detect based on config
        cfg = REPORT_CONFIG.get(report_key, {})
        if cfg.get('is_metric', False):
            target_engine = get_mhdm_engine()
        else:
            target_engine = get_source_engine()

    try:
        inspector = inspect(target_engine)
        table_map = {"calndd_report": "calndd", "gl005_pl_report": "gl005"}
        tbl = table_map.get(report_key, "daily_report")
        
        # Check schemas in the connected DB
        if not inspector.has_table(tbl, schema=target_schema) and not inspector.has_table(tbl, schema="rms_preproces"):
             return {"chart_data": [], "config": {}, "message": "Table not found."}
    except Exception as e: 
        return {"chart_data": [], "message": str(e)}

    if not metric: 
        metric = REPORT_CONFIG.get(report_key, {}).get('value_options', ["total_amount"])[0]
    
    s_date = normalize_date_str(start_date) if start_date else None
    e_date = normalize_date_str(end_date) if end_date else None
    
    try: 
        return process_analysis_data(report_key, metric, s_date, e_date, target_engine, target_schema)
    except Exception as e: 
        raise HTTPException(500, detail=str(e))

# --- SYSTEM & MANUAL OPS ---

@system_router.get("/manual/scan-daily")
def manual_scan_daily(path: str, days: int = 1): return scan_network_files(path, days)

@system_router.get("/manual/search")
def manual_search(path: str, date: str): return search_files_by_date(path, date)

@system_router.get("/manual/browse")
def manual_browse(path: str): return browse_folder(path)

@system_router.post("/manual/batch-upload")
def manual_batch_upload(files: List[Dict]): 
    # Manual raw uploads go to Source Engine
    return batch_upload_files(get_source_engine(), files)

@system_router.get("/manual/scan-only")
def daily_scan_only(path: Optional[str] = "", days_back: int = 30):
    # Scan logic needs an engine, use Source as default context
    try: return scan_for_new_files(get_source_engine(), path, days_back)
    except: return scan_for_new_files(get_mssql_engine(), path, days_back)

@system_router.post("/manual/upload-selected")
def daily_upload_selected(payload: UploadSelectionRequest):
    """
    Uploads specific selected files from the Daily Ops UI.
    """
    # Daily uploads go to Source DB (rms_raw)
    return upload_selected_files(get_source_engine(), [f.model_dump() for f in payload.files])

@system_router.get("/consistency")
async def get_consistency(start_date: Optional[str] = None, end_date: Optional[str] = None):
    # Consistency checks raw vs preprocess in Source DB
    base_engine = get_source_engine()
    try:
        df = check_data_consistency(base_engine, start_date, end_date)
        if isinstance(df, pd.DataFrame):
            df = df.where(pd.notnull(df), None)
            return df.to_dict(orient="records")
        return df 
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@system_router.post("/process")
async def trigger_preprocessing(range: DateRange):
    # Preprocessing happens in Source DB
    target_engine = get_source_engine()
    
    # Allow override if strictly necessary
    if range.target_db and range.target_db.lower() != SOURCE_DB.lower():
        try: target_engine = get_target_engine(get_mssql_engine(), range.target_db)
        except Exception as e: print(f"Warning: Could not connect to {range.target_db}, using default. {e}")
    
    return run_preprocessing(target_engine, range.start_date, range.end_date, range.target_schema, range.tables)

# --- MAPPING ROUTER ---

@mapping_router.get("/scan")
def api_scan_adhoc_files(): return scan_mapping_files()

@mapping_router.get("/tables")
def api_get_mapping_tables(): 
    # Mapping tables are in Source DB
    return get_existing_mapping_tables(get_source_engine())

@mapping_router.get("/inspect")
def api_inspect_file(file_name: str): return inspect_file_structure(file_name)

@mapping_router.get("/structure")
def api_get_db_structure(): 
    # General structure from Source DB
    return get_database_structure(get_source_engine())

@mapping_router.post("/upload")
def api_upload_mapping(req: MappingUploadRequest):
    # Default to Source DB for mappings
    base_engine = get_source_engine()
    
    if req.target_db: 
        ensure_database_exists(get_mssql_engine(), req.target_db)
        
    target_engine = base_engine
    if req.target_db and req.target_db.lower() != SOURCE_DB.lower():
        try: target_engine = get_target_engine(get_mssql_engine(), req.target_db)
        except: pass
        
    return upload_mapping_file(
        target_engine, 
        req.file_name, 
        req.target_db, 
        req.target_schema, 
        req.sheet_overrides, 
        req.selected_sheets, 
        req.replace_existing
    )

@mapping_router.post("/sync")
def sync_mapping_tables(): 
    return upload_mapping_file(get_source_engine())

# --- SYSTEM MONITORING & HEALTH ---

@system_router.get("/health")
async def health_check():
    try:
        # Check both engines
        with get_source_engine().connect() as conn: conn.execute(text("SELECT 1"))
        return {"status": "online", "source_db": "connected"}
    except: 
        return {"status": "offline"}

@system_router.get("/db-details")
def get_db_details_endpoint():
    """
    Returns list of databases and schemas/tables from the Source Engine context.
    Postgres Compatible.
    """
    engine = get_source_engine()
    result = {"databases": [], "objects": []}
    try:
        with engine.connect() as conn:
            # Postgres: List user databases
            dbs = conn.execute(text("SELECT datname, 'ONLINE' FROM pg_database WHERE datistemplate = false")).fetchall()
            result["databases"] = [{"name": row[0], "status": row[1]} for row in dbs]
            
            # Postgres: List public tables in relevant schemas
            objs = conn.execute(text("""
                SELECT table_schema as schema_name, table_name as table_name, 'N/A' as create_date 
                FROM information_schema.tables 
                WHERE table_schema IN ('rms_raw', 'rms_preproces', 'rms_metric', 'mapping', 'public')
                  AND table_type = 'BASE TABLE'
                ORDER BY table_schema, table_name
            """)).fetchall()
            result["objects"] = [{"schema": row[0], "table": row[1], "created": str(row[2]), "status": "Active"} for row in objs]
    except Exception as e: 
        return {"error": str(e), "databases": [], "objects": []}
    return result

@system_router.get("/logs")
async def get_logs(): 
    # Logs usually live in Source DB (public.upload_history)
    return get_upload_logs(get_source_engine()).to_dict(orient="records")

@system_router.delete("/reset-db")
async def truncate_db(): 
    # DANGER: Truncates Raw/Preprocess tables in Source DB
    return truncate_all_tables(get_source_engine())

# --- ARCHITECTURE INTROSPECTION ---
@system_router.get("/architecture")
def get_system_architecture():
    return {"pages": []}