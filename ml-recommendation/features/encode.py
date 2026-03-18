"""
Encode a SkillProfile into a fixed-size numerical vector for TensorFlow.
- Numerical features (height, weight, age) are min-max normalized.
- Categorical single-choice: one-hot.
- Categorical multi-choice (techniques, goals, martial arts): multi-hot.
"""
import numpy as np
from typing import List

from data.schema import SkillProfile
from config.vocabularies import (
    GENDERS,
    PREFERRED_TECHNIQUES,
    TRAINING_GOALS,
    EXPERIENCE_LEVELS,
    MARTIAL_ARTS_OPTIONS,
    EXPERIENCE_DURATIONS,
    CURRENT_FITNESS_LEVELS,
    TRAINING_FREQUENCIES,
    HEIGHT_RANGE,
    WEIGHT_RANGE,
    AGE_RANGE,
)


def _norm(val: float, low: float, high: float) -> float:
    if high <= low:
        return 0.0
    return float(np.clip((val - low) / (high - low), 0.0, 1.0))


def _one_hot(value: str, vocab: List[str]) -> np.ndarray:
    arr = np.zeros(len(vocab), dtype=np.float32)
    if value and value in vocab:
        arr[vocab.index(value)] = 1.0
    return arr


def _multi_hot(values: List[str], vocab: List[str]) -> np.ndarray:
    arr = np.zeros(len(vocab), dtype=np.float32)
    for v in values or []:
        if v in vocab:
            arr[vocab.index(v)] = 1.0
    return arr


def encode_profile(profile: SkillProfile) -> np.ndarray:
    """Encode a single skill profile to a 1D float32 vector."""
    pa = profile.physicalAttributes
    prefs = profile.preferences
    past = profile.pastExperience
    fit = profile.fitnessCapabilities

    # Numerical (3)
    height_n = _norm(pa.height, HEIGHT_RANGE[0], HEIGHT_RANGE[1])
    weight_n = _norm(pa.weight, WEIGHT_RANGE[0], WEIGHT_RANGE[1])
    age_n = _norm(pa.age, AGE_RANGE[0], AGE_RANGE[1])

    # Optional: limitations as binary (has limitations = 1)
    has_limitations = 1.0 if (pa.limitations and pa.limitations.strip()) else 0.0

    # Single-choice categoricals
    gender_oh = _one_hot(pa.gender, GENDERS)
    experience_oh = _one_hot(past.experienceLevel, EXPERIENCE_LEVELS)
    duration_oh = _one_hot(past.previousTrainingDetails or "", EXPERIENCE_DURATIONS)
    fitness_oh = _one_hot(fit.currentFitnessLevel, CURRENT_FITNESS_LEVELS)
    frequency_oh = _one_hot(fit.trainingFrequency, TRAINING_FREQUENCIES)

    # Multi-choice
    techniques_mh = _multi_hot(prefs.preferredTechnique, PREFERRED_TECHNIQUES)
    goals_mh = _multi_hot(prefs.trainingGoal, TRAINING_GOALS)
    martial_arts_mh = _multi_hot(past.martialArtsBackground or [], MARTIAL_ARTS_OPTIONS)

    parts = [
        np.array([height_n, weight_n, age_n, has_limitations], dtype=np.float32),
        gender_oh,
        techniques_mh,
        goals_mh,
        experience_oh,
        martial_arts_mh,
        duration_oh,
        fitness_oh,
        frequency_oh,
    ]
    return np.concatenate(parts)


def get_encoding_dim() -> int:
    """Total dimension of the encoded vector (for building the model)."""
    return (
        4
        + len(GENDERS)
        + len(PREFERRED_TECHNIQUES)
        + len(TRAINING_GOALS)
        + len(EXPERIENCE_LEVELS)
        + len(MARTIAL_ARTS_OPTIONS)
        + len(EXPERIENCE_DURATIONS)
        + len(CURRENT_FITNESS_LEVELS)
        + len(TRAINING_FREQUENCIES)
    )
