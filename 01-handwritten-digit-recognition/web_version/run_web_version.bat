@echo off
cd /d "%~dp0"
echo Starting Handwritten Digit Recognition (Web Version)...
echo The first run trains a model and may take about a minute.
echo Once you see "Running on http://127.0.0.1:5000", open that address in your browser.
python app.py
pause
