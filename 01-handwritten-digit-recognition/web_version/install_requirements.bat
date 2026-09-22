@echo off
cd /d "%~dp0"
echo Installing required packages for the web version...
python -m pip install -r requirements.txt
pause
