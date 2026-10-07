@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 請先安裝 Node.js 20 或以上，再重新執行。
  pause
  exit /b 1
)
echo 遊戲網址：http://localhost:4317
echo 保持這個視窗開啟，遊戲才能連線。
node server.mjs
pause
