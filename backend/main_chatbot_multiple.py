import os
import ssl
import asyncio
import parlant.sdk as p
from dotenv import load_dotenv
import pathlib
import traceback 
import sys

# --- 1. ROBUST ENV LOADING ---
try:
    env_path = pathlib.Path(__file__).resolve().parent.parent / '.env'
    if not env_path.exists():
        env_path = pathlib.Path(__file__).resolve().parent.parent.parent / '.env'
except NameError:
    env_path = pathlib.Path(os.getcwd()) / '.env'

load_dotenv(dotenv_path=env_path)

from config import MONGO_CONNECTION_STRING, PARLANT_PORT
from services.loggers import StdoutLogger
from services.gemini_service import GeminiService

# ✅ IMPORT GUIDELINES
from guidelines.greetings import register_greeting_guidelines
from guidelines.ncb_flows import register_ncb_guidelines
from guidelines.ldc_workflows import register_ldc_workflows

# ✅ IMPORT TOOLS (For Global Registration via @tool decorator)
# Even if not used directly here, importing them registers them in memory
try:
    from tools.ldc_tools import (
        submit_single_incident_tool, 
        update_incident_details_tool, 
        analyze_uploaded_file_tool
    )
    print("✅ [Main] LDC Tools imported and registered globally.")
except ImportError as e:
    print(f"❌ [Main] Error importing LDC Tools: {e}")

print(f"DEBUG: Connecting to Qdrant at: {os.getenv('QDRANT_HOST')}:{os.getenv('QDRANT_PORT')}")

# SSL Fix for local development
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['PYTHONHTTPSVERIFY'] = '0'
ssl._create_default_https_context = ssl._create_unverified_context

# --- 2. HELPERS ---
class NoOp:
    def __getattr__(self, name): return self
    def __call__(self, *args, **kwargs): return self
    def __await__(self):
        async def _(): return self
        return _().__await__()
    def __enter__(self): return self
    def __exit__(self, *args): pass
    async def __aenter__(self): return self
    async def __aexit__(self, *args): pass

class LoggingGeminiServiceWrapper:
    def __init__(self, service): self._service = service
    def __getattr__(self, name):
        attr = getattr(self._service, name)
        if name == "generate_completion":
            async def wrapper(*args, **kwargs):
                print(f"\n🔵 [USER]: {kwargs.get('prompt', args[0] if args else '').strip()}")
                result = await attr(*args, **kwargs)
                content = result.content if hasattr(result, "content") else str(result)
                print(f"🟣 [BOT]: {content.strip()}\n")
                return result
            return wrapper
        return attr

# --- 3. AGENT SETUP FUNCTIONS ---

async def setup_ldc_agent(server):
    """Retrieves or Creates the 'LDC Assistant'"""
    target_name = "LDC Assistant"
    
    # Check if agent already exists
    agents = await server.list_agents()
    existing_agent = next((a for a in agents if a.name == target_name), None)
    
    if existing_agent:
        print(f"   ✅ Using Existing Agent: {target_name} (ID: {existing_agent.id})")
        agent = existing_agent
    else:
        # Create New Agent if not found
        print(f"   👉 [Setup] Creating '{target_name}'...")
        agent = await server.create_agent(
            name=target_name,
            description=(
                "You are the LDC Assistant for NCB Bank. "
                "You help users report risk incidents manually or via Excel files. "
                "You can also help with basic FAQ about document uploads. "
                "Always be polite, professional, and strictly follow the workflows."
            ),
            max_engine_iterations=5
        )
        print(f"   ✅ Agent Created: {agent.name} (ID: {agent.id})")

    # ✅ REGISTER WORKFLOWS
    # This function inside 'ldc_workflows.py' will attach the tools to specific guidelines
    await register_ldc_workflows(agent)
    
    return agent

async def setup_internal_agent(server):
    """Retrieves or Creates 'The Assistant' for the Staff Dashboard"""
    target_name = "The Assistant"

    agents = await server.list_agents()
    existing_agent = next((a for a in agents if a.name == target_name), None)

    if existing_agent:
        print(f"   ✅ Using Existing Agent: {target_name} (ID: {existing_agent.id})")
        agent = existing_agent
    else:
        print(f"   👉 [Setup] Creating '{target_name}'...")
        agent = await server.create_agent(
            name=target_name,
            description=(
                "You are the AI Assistant for the NCB Risk Management Division. "
                "You have FULL access to database logs, risk scoring models, and internal files. "
                "Analyze uploaded files deeply and provide technical summaries. "
                "CRITICAL RULES: "
                "1. Follow defined guidelines strictly. "
                "2. When a guideline triggers, output ONLY the exact script provided. "
                "3. Do NOT start responses with fillers like 'Okay' or 'Sure'."
            ),
            max_engine_iterations=5 
        )
        print(f"   ✅ Agent Created: {agent.name} (ID: {agent.id})")
    
    # Register/Update Guidelines
    await register_greeting_guidelines(agent)
    await register_ncb_guidelines(agent)
    
    return agent

# --- 4. MAIN EXECUTION ---

async def main():
    print(f"🚀 [STARTUP] Multi-Agent Server | Port: {PARLANT_PORT} | PID: {os.getpid()}")
    
    noop_monitor = NoOp()
    logger = StdoutLogger(tracer=noop_monitor)
    service = LoggingGeminiServiceWrapper(GeminiService(logger=logger, tracer=noop_monitor, meter=noop_monitor))
    store = MONGO_CONNECTION_STRING if MONGO_CONNECTION_STRING else None

    try:
        async with p.Server(
            nlp_service=lambda c: service,
            session_store=store,
            port=int(PARLANT_PORT),
            host="0.0.0.0"
        ) as server:
            
            # --- SETUP AGENTS ---
            await setup_ldc_agent(server)       
            await setup_internal_agent(server) 
            
            print(f"🔗 Server Online at: http://localhost:{PARLANT_PORT}")
            print("⏳ Waiting for connections...")

            # ✅ CRITICAL: This keeps the server running.
            #await asyncio.Event().wait()

    except BaseException as e:
        print("\n" + "!"*50)
        print("❌ FATAL CRASH CAUGHT")
        print(f"Error: {e}")
        traceback.print_exc()
        print("!"*50 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Chatbot stopped.")