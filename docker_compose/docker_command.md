docker network create app_shared_bridge

docker compose --env-file "F:\Projects\chatbot_local\.env" -f "F:\Projects\chatbot_local\docker_compose\docker-compose.infra.yml" -p infra up -d

docker compose --env-file "F:\Projects\chatbot_local\.env" -f "F:\Projects\chatbot_local\docker_compose\docker-compose.backend.yml" -p backend up -d --build

docker compose --env-file "F:\Projects\chatbot_local\.env" -f "F:\Projects\chatbot_local\docker_compose\docker-compose.ui.yml" -p ui up -d --build