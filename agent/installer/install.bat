@echo off
chcp 65001 >nul
setlocal enableextensions

echo ========================================
echo   Tellustech SNMP Agent 설치
echo ========================================
echo.

set "TARGET=C:\Tellustech"

if not exist "%TARGET%" mkdir "%TARGET%"

REM 자동 업데이트 .pending 파일이 있으면 먼저 교체
if exist "%TARGET%\update\new-agent.exe.pending" (
    echo 자동 업데이트 적용 중...
    taskkill /f /im tellustech-agent.exe 2>nul
    timeout /t 2 /nobreak >nul
    move /Y "%TARGET%\update\new-agent.exe.pending" "%TARGET%\tellustech-agent.exe" >nul
    echo ✅ 업데이트 완료
)

REM 신규 파일 복사 (현재 폴더 → 설치 폴더)
copy /Y "%~dp0tellustech-agent.exe" "%TARGET%\" >nul
copy /Y "%~dp0config.json" "%TARGET%\" >nul

REM PC 부팅 시 자동 실행 등록 (silent 모드)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "TellustechAgent" /t REG_SZ /d "\"%TARGET%\tellustech-agent.exe\" --silent" /f >nul

REM 보안: ZIP 의 config.json 즉시 삭제 (토큰 노출 방지)
del /Q "%~dp0config.json" >nul 2>&1

echo.
echo 프린터 검색을 시작합니다...
echo.
"%TARGET%\tellustech-agent.exe" --setup

echo.
echo ✅ 설치 완료! 에이전트가 백그라운드에서 자동 실행됩니다.
echo    제거: %TARGET%\uninstall.bat
echo.
copy /Y "%~dp0uninstall.bat" "%TARGET%\" >nul 2>&1

pause
endlocal
