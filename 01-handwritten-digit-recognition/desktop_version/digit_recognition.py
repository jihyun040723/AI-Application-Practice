"""
Handwritten Digit Recognition Program
Draw a digit (0-9) with the mouse and the trained neural network predicts it.
Model: simple dense neural network trained on the MNIST dataset.
"""

import os
import sys

# When packaged with PyInstaller in windowed mode (no console), stdout/stderr
# are None. Keras' training progress bar writes to them, which would crash
# with "'NoneType' object has no attribute 'write'" unless we redirect here.
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

import tkinter as tk
from tkinter import messagebox
import numpy as np
from PIL import Image, ImageDraw
import tensorflow as tf
from tensorflow import keras


def build_and_train_model():
    """Load MNIST, build a small dense neural network, and train it."""
    print("Loading MNIST dataset...")
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()

    # Normalize pixel values to the 0-1 range
    x_train = x_train.astype("float32") / 255.0
    x_test = x_test.astype("float32") / 255.0

    print("Building neural network model...")
    model = keras.Sequential([
        keras.layers.Input(shape=(28, 28)),
        keras.layers.Flatten(),
        keras.layers.Dense(128, activation="relu"),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(64, activation="relu"),
        keras.layers.Dense(10, activation="softmax"),
    ])

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    print("Training model...")
    model.fit(x_train, y_train, epochs=5, validation_split=0.1, verbose=1)

    test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
    print(f"Test accuracy: {test_acc * 100:.2f}%")

    return model


class DigitRecognitionApp:
    """Tkinter application that lets the user draw a digit and recognize it."""

    CANVAS_SIZE = 280  # Display canvas size in pixels (10x scale of 28x28)
    BRUSH_SIZE = 12

    def __init__(self, root, model):
        self.root = root
        self.model = model
        self.root.title("Handwritten Digit Recognition")
        self.root.resizable(False, False)

        # In-memory image that mirrors what is drawn on the canvas.
        # Used to feed pixel data into the model.
        self.image = Image.new("L", (self.CANVAS_SIZE, self.CANVAS_SIZE), color=0)
        self.draw = ImageDraw.Draw(self.image)

        self.last_x = None
        self.last_y = None

        self._build_ui()

    def _build_ui(self):
        # Drawing canvas
        self.canvas = tk.Canvas(
            self.root,
            width=self.CANVAS_SIZE,
            height=self.CANVAS_SIZE,
            bg="black",
            cursor="cross",
        )
        self.canvas.grid(row=0, column=0, columnspan=2, padx=10, pady=10)
        self.canvas.bind("<B1-Motion>", self.paint)
        self.canvas.bind("<ButtonRelease-1>", self.reset_last_position)

        # Buttons
        clear_btn = tk.Button(self.root, text="Clear", command=self.clear_canvas, width=12)
        clear_btn.grid(row=1, column=0, padx=10, pady=(0, 10))

        recognize_btn = tk.Button(
            self.root, text="Recognize", command=self.recognize_digit, width=12
        )
        recognize_btn.grid(row=1, column=1, padx=10, pady=(0, 10))

        # Result labels
        self.result_label = tk.Label(
            self.root, text="Draw a digit and click 'Recognize'", font=("Arial", 14, "bold")
        )
        self.result_label.grid(row=2, column=0, columnspan=2, pady=(0, 5))

        self.confidence_label = tk.Label(self.root, text="", font=("Arial", 11))
        self.confidence_label.grid(row=3, column=0, columnspan=2, pady=(0, 10))

        hint_label = tk.Label(
            self.root,
            text="Draw a digit (0-9) in the black area above.\nThen click 'Recognize' to see the prediction.",
            font=("Arial", 9),
            fg="gray",
        )
        hint_label.grid(row=4, column=0, columnspan=2, pady=(0, 10))

    def paint(self, event):
        x, y = event.x, event.y
        r = self.BRUSH_SIZE // 2

        if self.last_x is not None and self.last_y is not None:
            # Draw a line on the visible canvas
            self.canvas.create_line(
                self.last_x, self.last_y, x, y,
                width=self.BRUSH_SIZE, fill="white",
                capstyle=tk.ROUND, smooth=True,
            )
            # Mirror the same line on the in-memory image
            self.draw.line(
                [self.last_x, self.last_y, x, y],
                fill=255, width=self.BRUSH_SIZE,
            )
        else:
            self.canvas.create_oval(x - r, y - r, x + r, y + r, fill="white", outline="white")
            self.draw.ellipse([x - r, y - r, x + r, y + r], fill=255)

        self.last_x, self.last_y = x, y

    def reset_last_position(self, event):
        self.last_x, self.last_y = None, None

    def clear_canvas(self):
        self.canvas.delete("all")
        self.image = Image.new("L", (self.CANVAS_SIZE, self.CANVAS_SIZE), color=0)
        self.draw = ImageDraw.Draw(self.image)
        self.result_label.config(text="Draw a digit and click 'Recognize'")
        self.confidence_label.config(text="")

    def recognize_digit(self):
        # Resize the 280x280 drawing down to the 28x28 MNIST input size
        small_image = self.image.resize((28, 28), Image.LANCZOS)
        img_array = np.array(small_image).astype("float32") / 255.0

        if img_array.sum() == 0:
            messagebox.showinfo("No drawing", "Please draw a digit before recognizing.")
            return

        img_array = img_array.reshape(1, 28, 28)

        predictions = self.model.predict(img_array, verbose=0)[0]
        predicted_digit = int(np.argmax(predictions))
        confidence = float(predictions[predicted_digit]) * 100

        self.result_label.config(text=f"Predicted Digit: {predicted_digit}")
        self.confidence_label.config(text=f"Confidence: {confidence:.2f}%")


def main():
    model = build_and_train_model()

    root = tk.Tk()
    app = DigitRecognitionApp(root, model)
    root.mainloop()


if __name__ == "__main__":
    main()
