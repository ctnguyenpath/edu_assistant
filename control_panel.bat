@echo off
setlocal

:: --- 1. CONFIGURATION ---
set "BASE_DIR=%~dp0"
:: Remove trailing backslash
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

set "ENV_FILE=%BASE_DIR%\.env"
set "COMPOSE_DIR=%BASE_DIR%\docker_compose"

:: --- 2. MENU LOOP ---
:menu
cls
echo ========================================================
echo   EDU APP SYSTEM - CONTROL PANEL (Windows)
echo ========================================================
echo.
echo   1. Start System
echo   2. Stop System
echo   3. Restart System (Clean rebuild + Wipe EDU Data)
echo   4. Exit
echo.
set /p choice="Select an option (1-4): "

if "%choice%"=="1" goto start_system
if "%choice%"=="2" goto stop_system
if "%choice%"=="3" goto restart_system
if "%choice%"=="4" goto end
goto menu

:start_system
echo.
echo [1/4] Creating Network...
docker network create edu_app_bridge >nul 2>&1

echo [2/4] Starting Infrastructure...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_DIR%\docker-compose.infra.yml" -p edu_infra up -d

echo      - Waiting 12 seconds for Database Seeding...
timeout /t 12 /nobreak >nul

echo [3/4] Starting Backend...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_DIR%\docker-compose.backend.yml" -p edu_backend up -d --build

echo [4/4] Starting UI...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_DIR%\docker-compose.ui.yml" -p edu_ui up -d --build

echo.
echo   SYSTEM STARTUP COMPLETE!
pause
goto menu

:stop_system
echo.
echo [1/6] Removing UI Layer...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_DIR%\docker-compose.ui.yml" -p edu_ui down --remove-orphans

echo [2/6] Removing Backend Layer...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_DIR%\docker-compose.backend.gpu.yml" -p edu_backend down --remove-orphans

echo [3/6] Removing Infrastructure Layer...
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_DIR%\docker-compose.infra.yml" -p edu_infra down --remove-orphans

echo [4/6] Cleaning up Shared Network...
docker network rm edu_app_bridge >nul 2>&1

echo [5/6] Cleaning lingering 'edu_' containers...
for /f "tokens=*" %%i in ('docker ps -a -q --filter "name=edu_"') do docker rm -f %%i >nul 2>&1

if "%WIPE_DATA%"=="1" (
    echo [6/6] Wiping 'edu_infra' Volumes...
    for /f "tokens=*" %%i in ('docker volume ls -q --filter "label=com.docker.compose.project=edu_infra"') do docker volume rm %%i >nul 2>&1
    echo     - EDU Data volumes cleared.
) else (
    echo [6/6] Skipping volume removal.
)

echo.
echo   SYSTEM STOP COMPLETE!
if "%IS_RESTART%"=="1" (
    set "IS_RESTART=0"
    set "WIPE_DATA=0"
    goto start_system
)
pause
goto menu

:restart_system
set "IS_RESTART=1"
set "WIPE_DATA=1"
goto stop_system

:end
endlocal