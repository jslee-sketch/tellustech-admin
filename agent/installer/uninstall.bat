@echo off
chcp 65001 >nul
echo Tellustech Agent 제거 중...

taskkill /f /im tellustech-agent.exe 2>nul
timeout /t 2 /nobreak >nul

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "TellustechAgent" /f 2>nul

rmdir /s /q "C:\Tellustech" 2>nul

echo ✅ 제거 완료!
pause
