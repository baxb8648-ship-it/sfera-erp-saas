@echo off
title SSH Tunnel to VPS (api.леоника56.рф)
echo ===================================================
echo   ЗАПУСК SSH-ТУННЕЛЯ К ВПС (api.леоника56.рф)
echo ===================================================
echo.

backend\venv\Scripts\python.exe start_tunnel.py
pause
