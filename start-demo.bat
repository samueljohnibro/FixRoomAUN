@echo off
setlocal
cd /d "%~dp0"

echo.
echo FixRoomAUN Demo
echo ---------------
echo Starting local application at http://localhost:8000
echo Close this window to stop the server.
echo.

start "" "http://localhost:8000/"
python server.py

if errorlevel 1 (
    echo.
    echo Python could not start the demo server.
    echo Install Python 3 and try again, or use VS Code Live Server for browsing.
    pause
)
