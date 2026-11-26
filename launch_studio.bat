@echo off
title Gyan Yatra AI Studio Launcher
cd /d "%~dp0"

netstat -ano | findstr :5000 | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Studio server is running on port 5000!
) else (
    echo [..] Starting Studio Server...
    start /min "Gyan Yatra AI Studio Server" cmd /c "npm start"
    timeout /t 3 /nobreak >nul
)

start http://localhost:5000
exit
