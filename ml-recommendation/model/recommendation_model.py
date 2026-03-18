"""
TensorFlow model for skill-profile recommendation.
Uses an autoencoder: encode profiles to a latent vector; similarity in latent space
= profile similarity. Recommendations = nearest neighbours in latent space.
"""
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

from features.encode import get_encoding_dim


def build_autoencoder(
    input_dim: int,
    latent_dim: int = 32,
    hidden_dims: list[int] = [64, 48],
    dropout: float = 0.2,
) -> keras.Model:
    """Build autoencoder: input -> encoder -> latent -> decoder -> reconstruction."""
    encoder_input = keras.Input(shape=(input_dim,), name="profile_input")
    x = encoder_input
    for dim in hidden_dims:
        x = keras.layers.Dense(dim, activation="relu")(x)
        x = keras.layers.BatchNormalization()(x)
        x = keras.layers.Dropout(dropout)(x)
    latent = keras.layers.Dense(latent_dim, activation="relu", name="latent")(x)

    decoder_input = latent
    for dim in reversed(hidden_dims):
        decoder_input = keras.layers.Dense(dim, activation="relu")(decoder_input)
        decoder_input = keras.layers.BatchNormalization()(decoder_input)
        decoder_input = keras.layers.Dropout(dropout)(decoder_input)
    reconstruction = keras.layers.Dense(input_dim, activation="sigmoid", name="output")(
        decoder_input
    )

    autoencoder = keras.Model(encoder_input, reconstruction, name="profile_autoencoder")
    encoder = keras.Model(encoder_input, latent, name="encoder")
    return autoencoder, encoder


def build_similarity_model(
    input_dim: int,
    latent_dim: int = 32,
    hidden_dims: list[int] = [64, 48],
    dropout: float = 0.2,
) -> tuple[keras.Model, keras.Model]:
    """Build and return (autoencoder, encoder) for training and inference."""
    return build_autoencoder(
        input_dim=input_dim,
        latent_dim=latent_dim,
        hidden_dims=hidden_dims,
        dropout=dropout,
    )
