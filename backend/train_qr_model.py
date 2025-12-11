# backend/train_qr_model.py
"""
Train a CNN model to classify QR codes as malicious or benign.
Uses MobileNetV2 transfer learning for efficiency.
"""

import os
import numpy as np
from pathlib import Path

# TensorFlow imports
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam

# Configuration
DATASET_PATH = "../1000 QR Images of Malicious and Benign QR codes 2025"
MODEL_SAVE_PATH = "qr_classifier.keras"
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10

def prepare_dataset():
    """Prepare the dataset by organizing images into train/val splits."""
    print("[QR Trainer] Preparing dataset...")
    
    benign_dir = Path(DATASET_PATH) / "benign_qr_images_500"
    malicious_dir = Path(DATASET_PATH) / "malicious_qr_images_500"
    
    # Create temporary organized structure
    temp_dir = Path("temp_qr_dataset")
    train_dir = temp_dir / "train"
    val_dir = temp_dir / "val"
    
    for split_dir in [train_dir, val_dir]:
        (split_dir / "benign").mkdir(parents=True, exist_ok=True)
        (split_dir / "malicious").mkdir(parents=True, exist_ok=True)
    
    # Split and copy images (80% train, 20% val)
    import shutil
    
    for category, source_dir in [("benign", benign_dir), ("malicious", malicious_dir)]:
        images = list(source_dir.glob("*.png"))
        np.random.shuffle(images)
        
        split_idx = int(len(images) * 0.8)
        train_images = images[:split_idx]
        val_images = images[split_idx:]
        
        for img in train_images:
            shutil.copy(img, train_dir / category / img.name)
        for img in val_images:
            shutil.copy(img, val_dir / category / img.name)
    
    print(f"[QR Trainer] Dataset prepared: {len(list(train_dir.glob('**/*.png')))} train, {len(list(val_dir.glob('**/*.png')))} val")
    return str(train_dir), str(val_dir)

def create_model():
    """Create a MobileNetV2-based classifier."""
    print("[QR Trainer] Creating model...")
    
    # Load pre-trained MobileNetV2 (without top layers)
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(*IMAGE_SIZE, 3)
    )
    
    # Freeze base model layers
    base_model.trainable = False
    
    # Add classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.2)(x)
    predictions = Dense(1, activation='sigmoid')(x)  # Binary: malicious (1) vs benign (0)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    print(f"[QR Trainer] Model created with {model.count_params():,} parameters")
    return model

def train_model():
    """Main training function."""
    print("=" * 50)
    print("[QR Trainer] Starting QR Code Classifier Training")
    print("=" * 50)
    
    # Prepare dataset
    train_dir, val_dir = prepare_dataset()
    
    # Create data generators
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.1
    )
    
    val_datagen = ImageDataGenerator(rescale=1./255)
    
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        classes=['benign', 'malicious']
    )
    
    val_generator = val_datagen.flow_from_directory(
        val_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='binary',
        classes=['benign', 'malicious']
    )
    
    # Create and train model
    model = create_model()
    
    print("\n[QR Trainer] Training started...")
    history = model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=val_generator,
        verbose=1
    )
    
    # Save model
    model.save(MODEL_SAVE_PATH)
    print(f"\n[QR Trainer] Model saved to {MODEL_SAVE_PATH}")
    
    # Print final metrics
    final_acc = history.history['accuracy'][-1]
    final_val_acc = history.history['val_accuracy'][-1]
    print(f"[QR Trainer] Final Training Accuracy: {final_acc:.2%}")
    print(f"[QR Trainer] Final Validation Accuracy: {final_val_acc:.2%}")
    
    # Cleanup temp directory
    import shutil
    shutil.rmtree("temp_qr_dataset", ignore_errors=True)
    print("[QR Trainer] Cleaned up temporary files")
    
    return model

if __name__ == "__main__":
    train_model()
