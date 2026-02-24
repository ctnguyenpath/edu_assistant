LDC Assistant
# General journey
- Customner open chat screen, the chatbot automatically provides greeting 'xìn chào, tôi giup gì được bạn'?
- user can do some options likes:
# Option 1: direct report a single incident:
- User's input: "Tôi muốn thông báo/ báo cáo rủi ro", 'báo cáo rủi ro', 'ghi nhận rủi ro','báo cáo vấn đề'
- ai agent provide recommended instructions for inputs. User should include keywords like: user's name of department/ division, when the incident happened, where the incident happened
- user key in recommended input
- chatbot returns record id of incident and confirm that ai agent received information
- in backend, chatbot classify reported incident. If matching rate is higher than risk's threshold, chatbot will display 'Cám ơn bạn đã cung cấp thông tin, trường hợp {id} đã hoàn thành báo cáo'. Else,  matching rate is lower than the threshold, ai agent will request users to add more details. The request to add more details will show 1 time only. After user provides input, chatbot will display thankful to user to finish reporting incident.

- the chatbot ask user if they want to report other incident? 

# Option 2: upload and excel files with multiple incident:
- User's input: "Tôi muốn thông báo/ báo cáo rủi ro", 'báo cáo rủi ro', 'ghi nhận rủi ro','báo cáo vấn đề'. and/ or upload an excel files. 
- Ai agent say thank full to user. Then, backend processing files:
+ Create a new column name 'incident_id' to set unique id for each row. This id will  be used in whole system and processing.
+ Ai agent store excel file in minio and check whether excel files provide have enough required fields include: 'Mô tả chi tiết vụ việc', 'Chi nhánh','ĐVKD/Khối Trung tâm','Ngày phát sinh' and they are fully filled. Agent add a column named 'enough_infor'. If any value is missing, agent add 0 to the row else 1.
+ for rows have enough information, agent classify each incident (each row) If matching rate is higher than risk's threshold, agent will store classification. . If matching rate is lower than risk's threshold but higher than second threshold, the agent will classify as 'to be review'. If matching rate is lower than risk's  second threshold. Agent will classify as 'requiere more details'
- Agent combine all row have 0 value in 'enough_infor' and 'requiere more details' in a excel file to return to users for more details.

after user put additional information, ai agent say thank you and ask user do they need to report additional incident.