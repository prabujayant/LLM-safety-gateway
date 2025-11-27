# backend/train_model.py
"""
Utility script to (re)train the PromptShield risk model and persist artifacts.

Usage:
    python train_model.py
"""

from detection_engine import train_from_corpus, MODEL_PATH, SCALER_PATH


def main() -> None:
    scaler, model = train_from_corpus(persist=True)
    print("Training complete.")
    print(f"Saved scaler -> {SCALER_PATH}")
    print(f"Saved model  -> {MODEL_PATH}")
    print(f"Samples seen -> {len(model.classes_)} classes / coefficients: {model.coef_.shape}")


if __name__ == "__main__":
    main()