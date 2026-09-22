@echo off
cd /d "%~dp0"
echo Installing PyInstaller...
python -m pip install pyinstaller

echo Building standalone executable (this may take several minutes)...
python -m PyInstaller --onefile --windowed --name "HandwrittenDigitRecognition" digit_recognition.py

echo.
echo Done! The executable is at dist\HandwrittenDigitRecognition.exe
pause
