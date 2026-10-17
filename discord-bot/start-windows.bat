@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 請先安裝 Node.js 24 LTS，再重新開啟此檔案。
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>24||(v[0]===24&&v[1]>=17)?0:1)"
if errorlevel 1 (
  echo 請更新 Node.js 至 24.17.0 或更新版本。
  pause
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo 請在記事本填入三個設定值，儲存並關閉記事本。
  echo Token 只填在你自己電腦的 .env，請勿貼到聊天室。
  start /wait notepad.exe .env
)
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
call npm run register
if errorlevel 1 goto failed
call npm start
if errorlevel 1 goto failed
exit /b 0
:failed
echo 啟動尚未完成，請參考上面的訊息。可用記事本重新檢查 .env。
pause
exit /b 1
