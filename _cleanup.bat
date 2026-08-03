@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ==========================================
echo   불필요한 WASM 변형 파일 정리
echo ==========================================
echo.
echo   MediaPipe는 SIMD판 또는 비SIMD판 중
echo   하나만 사용합니다. module 변형은 쓰이지
echo   않으므로 지워도 동작에 영향이 없습니다.
echo.

set "D=tools\lib\mediapipe\wasm"
set FOUND=0

if exist "%D%\vision_wasm_module_internal.wasm" (
  set FOUND=1
  echo   삭제: vision_wasm_module_internal.wasm
  del /q "%D%\vision_wasm_module_internal.wasm"
)
if exist "%D%\vision_wasm_module_internal.js" (
  set FOUND=1
  echo   삭제: vision_wasm_module_internal.js
  del /q "%D%\vision_wasm_module_internal.js"
)

if "%FOUND%"=="0" (
  echo   지울 파일이 없습니다. 이미 정리되었습니다.
) else (
  echo.
  echo   약 12MB를 절약했습니다.
)

echo.
echo --- 남은 파일 ---
dir /b "%D%"
echo.

echo 이 배치 파일 자신은 저장소에 올라가지 않도록
echo .gitignore 에 등록합니다.
findstr /x "_cleanup.bat" .gitignore >nul 2>&1
if errorlevel 1 echo _cleanup.bat>>.gitignore

echo.
echo 완료되었습니다. 이제 커밋하고 푸시하세요.
echo.
pause
