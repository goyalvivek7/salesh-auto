@echo off
setlocal

rem Change to the directory where this script is located
pushd "%~dp0"

set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

if not exist "%BACKEND_DIR%" (
    echo Backend directory not found at "%BACKEND_DIR%".
    echo Please verify the project structure and try again.
    goto :finish
)

if not exist "%FRONTEND_DIR%" (
    echo Frontend directory not found at "%FRONTEND_DIR%".
    echo Please verify the project structure and try again.
    goto :finish
)

echo Starting backend (FastAPI)...
if exist "%BACKEND_DIR%\venv\Scripts\activate.bat" (
    start "ATS-AI Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
) else (
    start "ATS-AI Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

echo Starting frontend (Vite)...
start "ATS-AI Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo.
echo Launch commands sent. New windows should appear for backend and frontend servers.
echo You can close this window now or press any key to exit.
pause >nul

:finish
popd
endlocal

