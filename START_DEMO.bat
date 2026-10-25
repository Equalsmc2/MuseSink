@echo off
cd /d "%~dp0"
echo.
echo  ===================================================
echo   MuseSink v2 - lightweight local preview
 echo  ===================================================
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  start "" /B py -m http.server 5500
) else (
  start "" /B python -m http.server 5500
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:5500"
echo  Open at http://localhost:5500
 echo  Keep this window open while testing. Close it to stop.
pause >nul
