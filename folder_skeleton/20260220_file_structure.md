
chatbot_local/
├── .env
├── docker-compose.yml
├── migrate_structure.py
├── note.txt
├── remove_system.bat
├── start_all.bat
├── stop_all.bat
├── tasks.json
├── text.md
├── upload_containers.bat
└── __Init__.py
├── .vscode/
│   └── settings.json
├── archive/
│   ├── ldc_workflows_manual.py
│   └── main_chatbot.py
├── backend/
│   ├── auth_server.py
│   ├── client_secret_1086725271827-odk49dtsjb79jn44rhb02o2cqs9msp8c.apps.googleusercontent.com.json
│   ├── config.py
│   ├── database.py
│   ├── Dockerfile
│   ├── main_chatbot_multiple.py
│   ├── main_data_ops.py
│   ├── requirements.txt
│   └── __init__.py
│   ├── data_ops/
│   │   ├── manual_ops.py
│   │   ├── stl_analysis.py
│   │   ├── stl_data_export.py
│   │   ├── stl_functions.py
│   │   ├── stl_metric_calculation.py
│   │   ├── stl_mssql_connect.py
│   │   ├── stl_operation_log.py
│   │   ├── stl_preprocessing.py
│   │   ├── stl_system_init.py
│   │   ├── stl_upload_daily.py
│   │   ├── stl_upload_mapping.py
│   │   └── __init__.py
│   ├── embedding/
│   │   ├── embedding_factory.py
│   │   └── __init__.py
│   ├── guidelines/
│   │   ├── greetings.py
│   │   ├── ldc_flow.md
│   │   ├── ldc_workflows.py
│   │   ├── ncb_flows.py
│   │   └── __init__.py
│   ├── orm_service/
│   │   ├── rom_manager.py
│   │   └── __init__.py
│   │   ├── ldc_classification/
│   │   │   ├── ldc_service.py
│   │   │   └── __init__.py
│   ├── parlant-data/
│   │   ├── cache_embeddings.json
│   │   ├── evaluation_cache.json
│   │   └── parlant.log
│   ├── rag_process/
│   │   ├── download_embedding.py
│   │   ├── ldc_hybrid_qdrant.py
│   │   ├── ldc_upload_mongodb.py
│   │   ├── qdrant_management.py
│   │   └── __init__.py
│   ├── report/
│   │   ├── mhdm_history_dailyreport.py
│   │   └── __init__.py
│   ├── routers/
│   │   ├── data_ops_router.py
│   │   ├── kb_router.py
│   │   └── __init__.py
│   ├── services/
│   │   ├── gemini_service.py
│   │   ├── loggers.py
│   │   └── __init__.py
│   ├── sql_syntax/
│   │   ├── init_multiple_dbs.sql
│   │   └── __init__.py
│   ├── tools/
│   │   ├── find_id.py
│   │   ├── import_reference.py
│   │   ├── ldc_tools.py
│   │   ├── legal_tools.py
│   │   ├── list_qdrant_collections.py
│   │   ├── manual_delete.py
│   │   └── __init__.py
│   ├── user_managment/
│   │   ├── create_user.py
│   │   └── __init__.py
├── docker_compose/
│   ├── docker-compose.backend.gpu.yml
│   ├── docker-compose.backend.yml
│   ├── docker-compose.infra.yml
│   ├── docker-compose.ui.yml
│   ├── docker_command.md
│   └── management.yaml
├── folder_skeleton/
│   ├── 20260220_file_structure.md
│   ├── current_structure.md
│   ├── folder_skeleton.py
│   └── new_structure.md
├── frontend/
│   ├── .gitignore
│   ├── dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── README.md
│   ├── tailwind.config.js
│   └── vite.config.js
│   ├── .vite/
│   │   ├── deps/
│   │   │   ├── @react-oauth_google.js
│   │   │   ├── @react-oauth_google.js.map
│   │   │   ├── axios.js
│   │   │   ├── axios.js.map
│   │   │   ├── chunk-G3PMV62Z.js
│   │   │   ├── chunk-G3PMV62Z.js.map
│   │   │   ├── chunk-P6RTVJOB.js
│   │   │   ├── chunk-P6RTVJOB.js.map
│   │   │   ├── chunk-R3E4LXVO.js
│   │   │   ├── chunk-R3E4LXVO.js.map
│   │   │   ├── lucide-react.js
│   │   │   ├── lucide-react.js.map
│   │   │   ├── package.json
│   │   │   ├── react-dom_client.js
│   │   │   ├── react-dom_client.js.map
│   │   │   ├── react-router-dom.js
│   │   │   ├── react-router-dom.js.map
│   │   │   ├── react.js
│   │   │   ├── react.js.map
│   │   │   ├── recharts.js
│   │   │   ├── recharts.js.map
│   │   │   └── _metadata.json
│   ├── parlant-data/
│   │   ├── cache_embeddings.json
│   │   ├── evaluation_cache.json
│   │   └── parlant.log
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── api.js
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── config.js
│   │   ├── index.css
│   │   └── main.jsx
│   │   ├── api/
│   │   │   ├── dataOpsApi.js
│   │   │   └── kbApi.js
│   │   ├── assets/
│   │   │   ├── ncb_logo.jpg
│   │   │   └── react.svg
│   │   ├── components/
│   │   │   ├── ChatInput.jsx
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── chatMessage.jsx
│   │   │   ├── IconSend.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Typewriter.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── DailyOpsContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   ├── pages/
│   │   │   ├── DiscoverPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── KnowledgeBase.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── LoginPage_google.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── VideoPlayer.jsx
│   │   │   ├── datacourse/
│   │   ├── styles/
│   │   ├── utils/
│   │   │   └── agentService.js
│   │   ├── views/
│   │   │   ├── AnalysisView.jsx
│   │   │   ├── DailyOpsView.jsx
│   │   │   ├── DataDownloadView.jsx
│   │   │   ├── ManualOpsView.jsx
│   │   │   ├── MappingView.jsx
│   │   │   ├── MetricCalculationView.jsx
│   │   │   ├── MhdmDailyReportView.jsx
│   │   │   ├── MonitoringView.jsx
│   │   │   └── SystemArchitectureView.jsx
│   │   │   ├── orm_view/
│   │   │   │   └── ROMriskclassifier.jsx
├── oficial_react_ui/
│   ├── dockerfile
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
├── parlant-data/
│   └── parlant.log
├── test/
│   ├── Data_verification.py
│   ├── debug_hang.py
│   ├── debug_qdrant.py
│   ├── debug_setup.py
│   ├── ldc_service_test.py
│   ├── manual_test_classification.py
│   ├── test_query.py
│   └── __init__.py
├── upload_service/
│   ├── Dockerfile
│   ├── main.py
│   ├── requirements.txt
│   └── __init__.py
