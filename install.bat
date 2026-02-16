@echo off
setlocal enabledelayedexpansion

REM DevSecOps Platform Installation Script for Windows
REM This script sets up the complete DevSecOps platform

echo.
echo 🚀 DevSecOps Platform Installation
echo ==================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js v16+ and try again.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed. Please install Python 3.8+ and try again.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [INFO] Prerequisites check passed
echo.

REM Setup environment files
echo [INFO] Setting up environment files...

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [SUCCESS] Created backend\.env from template
    echo [WARNING] Please edit backend\.env with your database credentials
) else (
    echo [WARNING] backend\.env already exists, skipping...
)

if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env" >nul
    echo [SUCCESS] Created frontend\.env from template
) else (
    echo [WARNING] frontend\.env already exists, skipping...
)

echo.

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "backend\uploads\projects" mkdir "backend\uploads\projects"
if not exist "backend\logs" mkdir "backend\logs"
if not exist "ai-module\models" mkdir "ai-module\models"
echo [SUCCESS] Directories created
echo.

REM Install dependencies
echo [INFO] Installing dependencies...

echo [INFO] Installing root dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

echo [INFO] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

echo [INFO] Installing AI module dependencies...
cd ai-module

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    pause
    exit /b 1
)
call venv\Scripts\deactivate.bat
cd ..

echo [SUCCESS] All dependencies installed successfully
echo.

REM Check for Docker
docker --version >nul 2>&1
if not errorlevel 1 (
    docker-compose --version >nul 2>&1
    if not errorlevel 1 (
        set /p "use_docker=Do you want to start services with Docker? (y/n): "
        if /i "!use_docker!"=="y" (
            echo [INFO] Starting services with Docker Compose...
            docker-compose up -d
            if errorlevel 1 (
                echo [ERROR] Failed to start services with Docker
                pause
                exit /b 1
            )
            echo [SUCCESS] Services started with Docker
            goto :verify
        )
    )
)

REM Manual startup instructions
echo [INFO] To start the services manually, open separate command prompts and run:
echo.
echo Command Prompt 1 - Backend:
echo   cd backend
echo   npm start
echo.
echo Command Prompt 2 - Frontend:
echo   cd frontend
echo   npm start
echo.
echo Command Prompt 3 - AI Module:
echo   cd ai-module
echo   venv\Scripts\activate.bat
echo   python app.py
echo.

:verify
REM Wait a bit for services to start if using Docker
timeout /t 10 /nobreak >nul 2>&1

echo.
echo 🎉 Installation Complete!
echo ========================
echo.
echo Access your DevSecOps Platform:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:5000
echo   AI Module: http://localhost:5001
echo.
echo Demo Login Credentials:
echo   Admin: admin@devsecops.com / admin123
echo   Developer: dev@devsecops.com / dev123
echo.
echo Next Steps:
echo 1. Open http://localhost:3000 in your browser
echo 2. Login with demo credentials
echo 3. Upload a project or connect a GitHub repository
echo 4. Configure and run security scans
echo 5. Explore threat predictions and mitigation actions
echo.
echo Documentation:
echo   Setup Guide: SETUP.md
echo   Architecture: ARCHITECTURE.md
echo   README: README.md
echo.
echo Troubleshooting:
echo   Check logs: docker-compose logs [service-name]
echo   Restart services: docker-compose restart
echo   Stop services: docker-compose down
echo.

pause