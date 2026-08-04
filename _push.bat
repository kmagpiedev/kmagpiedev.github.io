@echo off
chcp 65001 >nul
cd /d D:\2025GitHub\Kmagpie_page

if exist _cleanup.bat del /q _cleanup.bat

echo.
echo === 변경 파일 목록 ===
git add -A
git status --short
echo.

git commit -m "애드센스 인증 스니펫 + ads.txt 추가, 배경 제거 도구 추가, 사이트맵 갱신"
git push

echo.
echo === 완료 ===
echo 1~2분 뒤 https://www.kmagpie.com/ads.txt 열어서 확인하세요.
pause
