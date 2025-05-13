@echo off
echo Checking and installing dependencies...

:: Check if pip is available
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo Error: pip not found. Please install Python with pip.
    pause
    exit /b 1
)

:: Install dependencies
echo Installing required packages...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

echo Starting servers...

:: Start Python WebSocket server in a new window
start cmd /k "python formant_server.py"

:: Wait a moment for the WebSocket server to start
timeout /t 2

:: Start HTTP server
python -m http.server 8001

:: Keep the window open
pause 