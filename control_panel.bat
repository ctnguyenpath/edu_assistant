@echo off
setlocal EnableDelayedExpansion

:: Define common paths
set ENV_FILE="F:\Projects\edu_assistant\.env"
set COMPOSE_DIR="F:\Projects\edu_assistant\docker_compose"

:menu
cls
echo ========================================================
echo   EDU APP SYSTEM - CONTROL PANEL
echo ========================================================
echo.
echo   1. Start System
echo   2. Stop System
echo   3. Restart System (Clean rebuild + Wipe EDU Data)
echo   4. Exit
echo.
choice /c 1234 /n /m "Select an option (1-4): "

if errorlevel 4 goto :eof
if errorlevel 3 (
    set IS_RESTART=1
    set WIPE_DATA=1
    goto stop
)
if errorlevel 2 (
    set IS_RESTART=0
    set WIPE_DATA=0
    goto stop
)
if errorlevel 1 (
    set IS_RESTART=0
    goto start
)

:stop
echo.
echo ========================================================
echo   STOPPING EDU APP SYSTEM...
echo ========================================================

echo [1/6] Removing UI Layer...
docker compose --env-file %ENV_FILE% -f "%COMPOSE_DIR%\docker-compose.ui.yml" -p edu_ui down --remove-orphans 2>nul

echo [2/6] Removing Backend Layer...
docker compose --env-file %ENV_FILE% -f "%COMPOSE_DIR%\docker-compose.backend.gpu.yml" -p edu_backend down --remove-orphans 2>nul

echo [3/6] Removing Infrastructure Layer (Databases)...
docker compose --env-file %ENV_FILE% -f "%COMPOSE_DIR%\docker-compose.infra.yml" -p edu_infra down --remove-orphans 2>nul

echo [4/6] Cleaning up Shared Network...
docker network rm edu_app_bridge 2>nul

echo [5/6] Cleaning lingering 'edu_' containers...
:: Direct command - no loop to break
docker ps -a -q --filter "name=edu_" > containers.tmp
for /f %%i in (containers.tmp) do docker rm -f %%i >nul 2>&1
del containers.tmp 2>nul

if "%WIPE_DATA%"=="1" (
    echo [6/6] Wiping 'edu_infra' Volumes...
    :: Using project-specific volume removal directly
    docker volume ls -q --filter "label=com.docker.compose.project=edu_infra" > volumes.tmp
    for /f %%v in (volumes.tmp) do docker volume rm %%v >nul 2>&1
    del volumes.tmp 2>nul
    echo     - EDU Data volumes cleared.
) else (
    echo [6/6] Skipping volume removal.
)

echo.
echo   SYSTEM STOP COMPLETE!
if "%IS_RESTART%"=="1" goto start
pause
goto menu

:start
set IS_RESTART=0
set WIPE_DATA=0
echo.
echo ========================================================
echo   STARTING EDU APP SYSTEM...
echo ========================================================
echo [1/4] Checking Network...
docker network create edu_app_bridge 2>nul

echo [2/4] Starting Infrastructure...
docker compose --env-file %ENV_FILE% -f "%COMPOSE_DIR%\docker-compose.infra.yml" -p edu_infra up -d

echo      - Waiting 12 seconds for Database Seeding...
timeout /t 12 /nobreak >nul

echo [3/4] Starting Backend...
docker compose --env-file %ENV_FILE% -f "%COMPOSE_DIR%\docker-compose.backend.gpu.yml" -p edu_backend up -d --build

echo [4/4] Starting UI...
docker compose --env-file %ENV_FILE% -f "%COMPOSE_DIR%\docker-compose.ui.yml" -p edu_ui up -d --build

echo.
echo   SYSTEM STARTUP COMPLETE!
pause
goto menu