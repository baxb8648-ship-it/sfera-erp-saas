@echo off
cd /d "%~dp0"
echo ===================================================
echo   ЛЕОНИКА CRM - СЕРВЕР ЗАПУЩЕН НА ЭТОМ КОМПЬЮТЕРЕ
echo ===================================================
echo.
echo 1. Запуск базы данных и API (FastAPI)...
cd backend
start cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo API запущено!
echo.
echo 2. Запуск защищенного туннеля (SSH)...
cd ..
start cmd /k "start_tunnel.bat"
echo.
echo ===================================================
echo Готово! Не закрывайте черные окна, пока нужна CRM.
echo ===================================================
pause
