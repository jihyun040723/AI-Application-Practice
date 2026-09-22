# Handwritten Digit Recognition

This project implements a handwritten digit recognition system using the
MNIST dataset, in two separate versions.

## Project Overview

A neural network is trained on the MNIST dataset (0-9 handwritten digit
images) and used to predict digits the user draws by hand. The project is
split into two independent implementations that share the same model
architecture and training approach but differ in how the drawing interface
is delivered.

## Directory Structure

- `desktop_version/` — Native Windows desktop app built with Python and
  Tkinter. See `desktop_version/CLAUDE.md` for details specific to this
  version.
- `web_version/` — Browser-based app served locally with Flask. See
  `web_version/CLAUDE.md` for details specific to this version.

## Tech Stack (shared)

- Python 3.11
- TensorFlow / Keras (MNIST dataset, dense neural network)
- NumPy, Pillow for image processing

## Code Style

- All code and comments are written in English.
- Keep each version self-contained: do not import files across
  `desktop_version/` and `web_version/`.

## Project Memory Rules

- All newly created files must include a comment with the creation
  date/time.

## Development Notes

- Each version trains its own model independently the first time it runs.
- This root file documents only what is common to both versions; open the
  CLAUDE.md inside each subfolder for version-specific instructions.
