@echo off
REM 에이전트 빌드 스크립트 (Windows 개발자용)
REM 결과: build/tellustech-agent.exe (단일 실행파일, Node 불필요)

setlocal enableextensions

cd /d "%~dp0"

echo [1/3] 의존성 설치...
call npm install

echo [2/3] TypeScript 컴파일...
call npm run build
if errorlevel 1 (
    echo ❌ 빌드 실패
    exit /b 1
)

echo [3/3] pkg 단일 exe 빌드...
if not exist build mkdir build
call npx pkg . -t node18-win-x64 -o build/tellustech-agent.exe
if errorlevel 1 (
    echo ❌ pkg 실패
    exit /b 1
)

echo.
echo ✅ 빌드 완료: build\tellustech-agent.exe
echo    배포: installer\ 의 install.bat / uninstall.bat / README.txt 와 함께 ZIP 으로 묶기
echo    config.json 은 ERP 의 [에이전트 패키지 다운로드] 로 별도 발급
endlocal
