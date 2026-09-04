@echo off
echo Starting Chennai Flood Nowcasting System...

echo Starting Backend server on port 8000...
start "Chennai Flood - Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend server on port 5173...
start "Chennai Flood - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo Both Backend and Frontend processes have been launched!
echo Frontend: http://127.0.0.1:5173
echo Backend:  http://127.0.0.1:8000/docs
echo =======================================================
