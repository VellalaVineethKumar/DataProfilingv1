@echo off
setlocal
title Enterprise Data Profiler Pro

rem Cleanest possible startup script to avoid path issues with parentheses

echo ==========================================
echo    Enterprise Data Profiler Pro
echo ==========================================
echo.

if exist "venv\Scripts\activate.bat" goto :ACTIVATE_VENV
if exist ".venv\Scripts\activate.bat" goto :ACTIVATE_DOTVENV
goto :NO_VENV

:ACTIVATE_VENV
echo [INFO] Activating virtual environment (venv)...
call "venv\Scripts\activate.bat"
goto :START_APP

:ACTIVATE_DOTVENV
echo [INFO] Activating virtual environment (.venv)...
call ".venv\Scripts\activate.bat"
goto :START_APP

:NO_VENV
echo [WARNING] No virtual environment (venv or .venv) detected.
echo [INFO] Using system Python and dependencies.

:START_APP
echo.
echo [INFO] Starting Streamlit application...
echo.

python -m streamlit run app.py

if ERRORLEVEL 1 goto :APP_ERROR
goto :APP_END

:APP_ERROR
echo.
echo [ERROR] Application failed to start. 
echo Please ensure you have installed the requirements:
echo pip install -r requirements.txt
echo.
echo Path: "%~dp0"
pause

:APP_END
echo.
echo Application stopped.
pause
