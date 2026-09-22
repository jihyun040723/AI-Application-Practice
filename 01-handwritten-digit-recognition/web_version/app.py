"""
Handwritten Digit Recognition - Web Version
Flask server that trains (or loads) an MNIST model and serves a browser-based
drawing canvas. The browser sends the drawn image to /predict and receives
the predicted digit plus a confidence breakdown for the top candidates.
"""

import base64
import io
import os
import threading

import numpy as np
from flask import Flask, jsonify, render_template, request
from PIL import Image
import tensorflow as tf
from tensorflow import keras

MODEL_PATH = os.path.join(os.path.dirname(__file__), "digit_model.keras")

app = Flask(__name__)
model = None  # Loaded/trained lazily in load_or_train_model()

# Tracks startup progress so the browser can show a "server is starting"
# page instead of failing to connect while the model trains.
model_status = {"ready": False, "message": "서버를 준비하고 있습니다..."}


def load_or_train_model():
    """Load a previously trained model from disk, or train a new one and save it."""
    global model

    if os.path.exists(MODEL_PATH):
        model_status["message"] = "저장된 모델을 불러오는 중입니다..."
        print(f"Loading existing model from {MODEL_PATH} ...")
        model = keras.models.load_model(MODEL_PATH)
        model_status["ready"] = True
        model_status["message"] = "준비 완료"
        return

    model_status["message"] = "MNIST 데이터셋을 내려받는 중입니다..."
    print("No saved model found. Training a new model on MNIST...")
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    x_train = x_train.astype("float32") / 255.0
    x_test = x_test.astype("float32") / 255.0

    model_status["message"] = "신경망을 구성하는 중입니다..."
    new_model = keras.Sequential([
        keras.layers.Input(shape=(28, 28)),
        keras.layers.Flatten(),
        keras.layers.Dense(128, activation="relu"),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(64, activation="relu"),
        keras.layers.Dense(10, activation="softmax"),
    ])

    new_model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    model_status["message"] = "모델을 학습하는 중입니다 (5 epoch, 약 30~60초)..."
    new_model.fit(x_train, y_train, epochs=5, validation_split=0.1, verbose=1)

    test_loss, test_acc = new_model.evaluate(x_test, y_test, verbose=0)
    print(f"Test accuracy: {test_acc * 100:.2f}%")

    model_status["message"] = "모델을 저장하는 중입니다..."
    new_model.save(MODEL_PATH)
    print(f"Model saved to {MODEL_PATH} for future runs.")

    model = new_model
    model_status["ready"] = True
    model_status["message"] = "준비 완료"


def decode_canvas_image(data_url):
    """Convert a base64 data URL from the canvas into a 28x28 normalized array."""
    header, encoded = data_url.split(",", 1)
    image_bytes = base64.b64decode(encoded)
    image = Image.open(io.BytesIO(image_bytes)).convert("L")

    # The canvas is drawn with a white stroke on a black background,
    # which already matches the MNIST convention (white digit on black).
    image = image.resize((28, 28), Image.LANCZOS)
    array = np.array(image).astype("float32") / 255.0
    return array


@app.route("/")
def index():
    if not model_status["ready"]:
        return render_template("loading.html", message=model_status["message"])
    return render_template("index.html")


@app.route("/status")
def status():
    return jsonify(model_status)


@app.route("/predict", methods=["POST"])
def predict():
    if not model_status["ready"]:
        return jsonify({"error": "모델이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요."}), 503

    payload = request.get_json(silent=True)
    if not payload or "image" not in payload:
        return jsonify({"error": "이미지 데이터가 없습니다"}), 400

    try:
        img_array = decode_canvas_image(payload["image"])
    except Exception as exc:
        return jsonify({"error": f"이미지를 디코딩할 수 없습니다: {exc}"}), 400

    if img_array.sum() == 0:
        return jsonify({"error": "캔버스가 비어 있습니다"}), 400

    img_array = img_array.reshape(1, 28, 28)
    predictions = model.predict(img_array, verbose=0)[0]

    top_indices = np.argsort(predictions)[::-1][:3]
    top_predictions = [
        {"digit": int(i), "confidence": round(float(predictions[i]) * 100, 2)}
        for i in top_indices
    ]

    return jsonify({
        "digit": top_predictions[0]["digit"],
        "confidence": top_predictions[0]["confidence"],
        "top_predictions": top_predictions,
    })


if __name__ == "__main__":
    # Train/load the model in the background so the server starts accepting
    # connections immediately; the browser sees a "server is starting" page
    # (loading.html) until model_status["ready"] becomes True.
    threading.Thread(target=load_or_train_model, daemon=True).start()
    app.run(host="127.0.0.1", port=5000, debug=False)
