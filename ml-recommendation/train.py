"""
Train the skill-profile recommendation model (TensorFlow).
Usage:
  cd ml-recommendation
  python train.py --data profiles.json [--epochs 50] [--latent-dim 32] [--out-dir ./output]
"""
import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

from data.load_data import load_profiles_from_json
from features.encode import encode_profile, get_encoding_dim
from model.recommendation_model import build_similarity_model


def main():
    parser = argparse.ArgumentParser(description="Train skill profile recommendation model")
    parser.add_argument("--data", type=str, required=True, help="Path to profiles JSON file")
    parser.add_argument("--epochs", type=int, default=50, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size")
    parser.add_argument("--latent-dim", type=int, default=32, help="Latent dimension")
    parser.add_argument("--out-dir", type=str, default="./output", help="Output directory for model and metadata")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    tf.random.set_seed(args.seed)
    np.random.seed(args.seed)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load and encode
    profiles = load_profiles_from_json(args.data)
    if len(profiles) < 2:
        raise SystemExit(
            "Need at least 2 profiles to train. Export more skill profiles from Firebase or add sample data."
        )

    X = np.array([encode_profile(p) for p in profiles], dtype=np.float32)
    input_dim = X.shape[1]
    assert input_dim == get_encoding_dim(), f"Encoding dim mismatch: {input_dim} vs {get_encoding_dim()}"

    # Build and train
    autoencoder, encoder = build_similarity_model(
        input_dim=input_dim,
        latent_dim=args.latent_dim,
        hidden_dims=[64, 48],
        dropout=0.2,
    )
    autoencoder.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["mae"],
    )

    # Optional validation split if enough data
    validation_split = 0.15 if len(X) >= 14 else 0.0
    autoencoder.fit(
        X,
        X,
        epochs=args.epochs,
        batch_size=min(args.batch_size, len(X)),
        validation_split=validation_split,
        shuffle=True,
        verbose=1,
    )

    # Save encoder (for inference) and metadata. Use .keras for Keras 3 compatibility.
    encoder_path = out_dir / "encoder.keras"
    encoder.save(encoder_path, save_format="keras")
    metadata = {
        "input_dim": int(input_dim),
        "latent_dim": int(args.latent_dim),
        "num_profiles_trained": len(profiles),
        "uids": [p.uid for p in profiles],
    }
    with open(out_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Save full profile list for recommendation lookup (optional: only uids + latent indices)
    with open(out_dir / "profile_uids.json", "w", encoding="utf-8") as f:
        json.dump(metadata["uids"], f, indent=2)

    print(f"Saved encoder to {encoder_path}, metadata to {out_dir / 'metadata.json'}")


if __name__ == "__main__":
    main()
