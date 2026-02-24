import parlant.sdk as p

async def register_ncb_guidelines(agent):
    print("   🔹 Loading NCB Info Guidelines...")

    # FLOW 1: THE MENU
    try:
        await agent.create_guideline(
            condition="The user says 'Khối Quản trị rủi ro NCB' or 'Hãy nói về Khối Quản trị rủi ro' or asks for an overview of the NCB Risk Management Division",
            action="IMMEDIATELY output this exact text only (NO PREFACES): 'Thông tin về khối đã được tổng hợp. Mình nghĩ đây là những điểm \"hot\" nhất đảm bảo bạn sẽ quan tâm:\n\n1.   🏢 Cơ cấu: Đại gia đình QTRR gồm những phòng ban nào?\n2.   🔥 Điểm nóng: Khối Risk NCB có gì đặc biệt và khác lạ?\n3.   😎 Check VAR: Soi độ \"chịu chơi\" của anh chị em nhà Risk xem thế nào nhé?\n4.   💼 Phong cách: Dân Risk làm việc \"ngầu\" và chất lượng ra sao?\n5.   🏆 Dấu ấn: Nhìn lại những cột mốc đáng nhớ trong hành trình vừa qua.\n\nBạn muốn mình \"review\" chi tiết mục nào, hay cần hỗ trợ gì khác không?'",
            criticality=p.Criticality.HIGH 
        )
    except Exception as e:
        print(f"   ⚠️ Error loading Flow 1: {e}")

    # FLOW 2: SUMMARY REQUEST
    try:
        await agent.create_guideline(
            condition="The user asks to summarize all the information above, wants a full synthesis (bản tổng hợp) of the Risk Management Division data or 'vui lòng tổng hợp các thông tin về khối'",
            action="IMMEDIATELY output this exact text only (NO PREFACES): 'Oh, đó là một yêu cầu hay! Việc gộp tất cả thông tin sẽ giúp bạn có cái nhìn toàn cảnh và sâu sắc nhất về \"hệ sinh thái\" QTRR.\nĐể nội dung này trở nên sinh động và dễ tiếp nhận nhất, tôi đề xuất các định dạng sau:\n\n 📄 Một bài viết chi tiết.\n\n 📊 Một bộ slides báo cáo chuyên nghiệp.\n\n 🎬 Hoặc một video highlight trực quan.\nBạn muốn tôi triển khai theo hình thức nào?'",
            criticality=p.Criticality.HIGH 
        )
    except Exception as e:
        print(f"   ⚠️ Error loading Flow 2: {e}")

    # FLOW 3: VIDEO CONFIRMATION
    try:
        await agent.create_guideline(
            condition="The user selects the 'Video' format, asks to make a video about QTRR NCB, or says 'hãy làm video về khối quản trị rủi ro'",
            action="IMMEDIATELY output this exact text only (NO PREFACES): 'Đã rõ! MÌnh đang tiến hành xử lý dữ liệu và tạo video về Khối Quản trị Rủi ro NCB dành riêng cho bạn. Vui lòng đợi trong giây lát...'",
            criticality=p.Criticality.HIGH
        )
    except Exception as e:
        print(f"   ⚠️ Error loading Flow 3: {e}")