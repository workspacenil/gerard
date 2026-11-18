@echo off
title AETHERIA - 3D Game Launcher
echo ===================================================
echo     AETHERIA: El Santuari Celeste (3D Game)
echo ===================================================
echo Iniciant servidor local de joc...
echo.

:: Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start http://localhost:8000
    python -m http.server 8000
    exit /b
)

:: If python is not in path, launch index.html directly
echo Python no detectat al PATH, obrint directament al navegador...
start index.html
exit /b
