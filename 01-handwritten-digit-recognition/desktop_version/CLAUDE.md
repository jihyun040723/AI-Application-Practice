# desktop_version

Native Windows desktop application for handwritten digit recognition.

## Project Overview

A Tkinter GUI lets the user draw a digit with the mouse on a black canvas.
Clicking "Recognize" feeds the drawing into a neural network trained on
MNIST and displays the predicted digit and confidence percentage.

## Commands

- Install dependencies: `pip install -r requirements.txt` (or double-click
  `install_requirements.bat`)
- Run the program: `python digit_recognition.py` (or double-click
  `run_digit_recognition.bat`)

## Tech Stack

- Python 3.11
- TensorFlow / Keras — model definition, training, and inference
- Pillow (PIL) — mirrors the canvas drawing into an in-memory image for
  resizing to 28x28
- Tkinter — GUI (built into Python, no separate install needed)

## Architecture

- `build_and_train_model()` — loads MNIST, builds a small dense neural
  network (Flatten -> Dense(128) -> Dropout -> Dense(64) -> Dense(10)),
  and trains it for 5 epochs every time the program starts.
- `DigitRecognitionApp` — Tkinter class that owns the canvas, buttons, and
  result labels. Drawing on the canvas mirrors each stroke onto a PIL
  `Image` object of the same size, which is later downsampled to 28x28 for
  the model.
- `main()` — trains the model, then opens the Tkinter window.

## Code Style

- All code and comments in English.
- Single-file script; keep functions small and focused (matches the
  current file structure).

## Development Notes

- The model retrains from scratch every time the program is launched
  (no caching), so startup takes roughly 30-60 seconds depending on the
  machine.
- `build_exe.bat` uses PyInstaller to package this script into a
  standalone `.exe` that can be run without a Python installation.
