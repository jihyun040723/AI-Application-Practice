# web_version

Browser-based handwritten digit recognition app.

## Project Overview

A Flask server trains (or loads a cached) MNIST model and serves an HTML
page with a drawing canvas. The browser sends the drawn image to a
`/predict` endpoint and displays the predicted digit along with the top-3
confidence breakdown as progress bars.

## Commands

- Install dependencies: `pip install -r requirements.txt` (or double-click
  `install_requirements.bat`)
- Run the server: `python app.py` (or double-click `run_web_version.bat`),
  then open `http://127.0.0.1:5000` in a browser.

## Tech Stack

- Python 3.11, Flask — web server and `/predict` API
- TensorFlow / Keras — model definition, training, and inference
- NumPy, Pillow — decoding the canvas image sent from the browser
- HTML5 Canvas + vanilla JavaScript — drawing UI (`templates/index.html`),
  no frontend framework or build step required

## Architecture

- `app.py`
  - `load_or_train_model()` — loads `digit_model.keras` if it already
    exists, otherwise trains a new model on MNIST and saves it so future
    runs start instantly.
  - `decode_canvas_image()` — converts the base64 PNG data URL sent from
    the browser into a normalized 28x28 NumPy array.
  - `GET /` — serves `templates/index.html`.
  - `POST /predict` — accepts `{ "image": "<data URL>" }`, returns the
    predicted digit, its confidence, and the top-3 predictions.
- `templates/index.html` — self-contained page (inline CSS/JS) with a
  280x280 canvas, Clear/Recognize buttons, and prediction bars. Supports
  both mouse and touch input.

## Code Style

- All code and comments in English.
- Keep the frontend as a single template file (no build tooling) unless
  the project grows enough to need one.

## Development Notes

- The trained model is cached to `web_version/digit_model.keras`. Delete
  this file to force retraining (e.g. after changing the architecture).
- The Flask dev server is for local use only (`app.run(debug=False)`);
  it is not meant to be exposed to the internet as-is.
