@echo off
setlocal
cd /d "%~dp0"
title MuseSink - Install to GitHub Desktop Repository
set "DEST="
echo MuseSink v2.1 - Copy website into your GitHub Desktop repo
echo.
echo FIRST: Create an empty repository named MuseSink in GitHub Desktop,
echo or open your existing MuseSink repo in File Explorer.
echo.
set /p "DEST=Paste the full local REPOSITORY FOLDER path: "
set "DEST=%DEST:"=%"
if not exist "%DEST%\.git" (
  echo.
  ERROR: That folder is not a Git repository - nothing copied.
  echo Open GitHub Desktop, Repository ^> Show in Explorer and copy that path.
  pause
  exit /b 1
)
if /I "%DEST%"=="%CD%" (
  echo ERROR: The destination must be a different folder.
  pause
  exit /b 1
)
echo.
echo Existing files at destination with matching names WILL be overwritten.
choice /c YN /m "Install MuseSink here"
if errorlevel 2 exit /b 0
for %%F in (index.html styles.css app.js firebase-config.js favicon.svg database.rules.json README.md SETUP_LIVE.py SETUP_LIVE.bat FINISH_FIREBASE_SETUP.bat START_DEMO.bat) do (
  copy /Y "%%F" "%DEST%\%%F" >nul
  if errorlevel 1 echo WARNING: Could not copy %%F
)
copy /Y "GO_LIVE_FIRST.md" "%DEST%\GO_LIVE_FIRST.md" >nul
copy /Y "CHANGELOG.md" "%DEST%\CHANGELOG.md" >nul
echo.
echo Files installed into %DEST%
echo Next: GitHub Desktop ^> Commit to main ^> Push origin.
echo If needed, enable Pages from Settings ^> Pages ^> Deploy from a branch (main / root).
echo.
pause
