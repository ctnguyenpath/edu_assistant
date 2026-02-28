#!/bin/bash

# --- 1. CONFIGURATION ---
# Dynamic path resolution
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$(uname)" == "Darwin" ]]; then
    ENV_FILE="$BASE_DIR/.env.mac"
    echo "🍎 macOS detected: Using .env.mac"
else
    ENV_FILE="$BASE_DIR/.env"
fi

COMPOSE_DIR="$BASE_DIR/docker_compose"

# --- 2. HELPER FUNCTIONS ---

# Fixes "TERM environment variable not set" in VS Code Output/Terminal
safe_clear() {

    if [ -n "$TERM" ] && [ "$TERM" != "dumb" ]; then
        clear
    else
        # Fallback for non-interactive shells
        printf "\033c" || printf "\n%.0s" {1..50}
    fi
}

check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Error: Docker is not running."
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
}

# --- 3. SYSTEM FUNCTIONS ---

stop_system() {
    echo -e "\n========================================================"
    echo "  STOPPING EDU APP SYSTEM..."
    echo "========================================================"

    echo "[1/6] Removing UI Layer..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_DIR/docker-compose.ui.yml" -p edu_ui down --remove-orphans 2>/dev/null

    echo "[2/6] Removing Backend Layer..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_DIR/docker-compose.backend.yml" -p edu_backend down --remove-orphans 2>/dev/null

    echo "[3/6] Removing Infrastructure Layer (Databases)..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_DIR/docker-compose.infra.yml" -p edu_infra down --remove-orphans 2>/dev/null

    echo "[4/6] Cleaning up Shared Network..."
    docker network rm edu_app_bridge 2>/dev/null

    echo "[5/6] Cleaning lingering 'edu_' containers..."
    # Get IDs and remove them in one line using xargs
    docker ps -a -q --filter "name=edu_" | xargs -r docker rm -f 2>/dev/null

    if [ "$WIPE_DATA" == "1" ]; then
        echo "[6/6] Wiping 'edu_infra' Volumes..."
        docker volume ls -q --filter "label=com.docker.compose.project=edu_infra" | xargs -r docker volume rm 2>/dev/null
        echo "    - EDU Data volumes cleared."
    else
        echo "[6/6] Skipping volume removal (Data preserved)."
    fi

    echo -e "\n  SYSTEM STOP COMPLETE!"
    
    if [ "$IS_RESTART" == "1" ]; then
        IS_RESTART=0
        WIPE_DATA=0
        start_system
    else
        read -p "Press enter to continue..."
    fi
}

start_system() {
    echo -e "\n========================================================"
    echo "  STARTING EDU APP SYSTEM..."
    echo "========================================================"

    echo "[1/4] Checking Network..."
    docker network create edu_app_bridge 2>/dev/null

    echo "[2/4] Starting Infrastructure..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_DIR/docker-compose.infra.yml" -p edu_infra up -d

    echo "     - Waiting 12 seconds for Database Seeding..."
    sleep 12

    echo "[3/4] Starting Backend..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_DIR/docker-compose.backend.yml" -p edu_backend up -d --build

    echo "[4/4] Starting UI..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_DIR/docker-compose.ui.yml" -p edu_ui up -d --build

    echo -e "\n  SYSTEM STARTUP COMPLETE!"
    read -p "Press enter to continue..."
}

# --- 4. MENU LOOP ---

# Initial check before entering loop
check_docker

while true; do
    safe_clear
    echo "========================================================"
    echo "  EDU APP SYSTEM - CONTROL PANEL (macOS)"
    echo "========================================================"
    echo ""
    echo "  1. Start System"
    echo "  2. Stop System"
    echo "  3. Restart System (Clean rebuild + Wipe EDU Data)"
    echo "  4. Exit"
    echo ""
    read -p "Select an option (1-4): " choice

    case $choice in
        1)
            IS_RESTART=0
            WIPE_DATA=0
            start_system
            ;;
        2)
            IS_RESTART=0
            WIPE_DATA=0
            stop_system
            ;;
        3)
            IS_RESTART=1
            WIPE_DATA=1
            stop_system
            ;;
        4)
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            sleep 1
            ;;
    esac
done