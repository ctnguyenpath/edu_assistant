import parlant.sdk as p

async def register_greeting_guidelines(agent):
    print("   🔹 Loading Greeting Guidelines...")
    
    # FLOW 4: STANDARD GREETING FALLBACK
    try:
        await agent.create_guideline(
            condition="The user says 'hello', 'hi', 'xin chào', 'hey xin chào' but does NOT mention NCB Risk Management specifically",
            action="IMMEDIATELY output this exact text only: 'Mình là 'LDC Assistant', trợ lý của Khối Quản Trị Rủi Ro trong ngân hàng NCB. Mình giúp gì được cho bạn hôm nay?'",
            criticality=p.Criticality.MEDIUM
        )
    except Exception as e:
        print(f"   ⚠️ Error loading Greeting: {e}")