@echo off
cd /d "%~dp0"
if exist "scripts\serve.cjs" (
  if not exist "Builds\UnityWeb\index.html" call npm run build
  if not exist "Builds\UnityWeb\index.html" exit /b 1
  start "" http://127.0.0.1:18136/
  node scripts\serve.cjs
) else (
  start "" http://127.0.0.1:18136/
  node serve.cjs
)
pause
