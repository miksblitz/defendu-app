"""
Run recommendations: given a skill profile (or uid), return top-k similar profiles.
Usage:
  cd ml-recommendation
  python inference.py --model-dir ./output --profiles profiles.json [--uid <uid> | --profile <path>] [--top-k 5]
If --uid is set, that profile is used as query from --profiles; else --profile must point to a single profile JSON.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

from data.load_data import load_profiles_from_json
from data.schema import SkillProfile
from features.encode import encode_profile


def _load_encoder_savedmodel(encoder_path: Path, input_dim: int) -> keras.Model:
    """Load legacy SavedModel (Keras 2 / TF2) so it works with Keras 3."""
    saved = tf.saved_model.load(str(encoder_path))
    sig = saved.signatures.get("serving_default") or list(saved.signatures.values())[0]
    # Input name from signature (our model uses "profile_input")
    try:
        part = sig.structured_input_signature[0]
        input_name = list(part.keys())[0] if isinstance(part, dict) else "profile_input"
    except Exception:
        input_name = "profile_input"
    output_keys = sig.structured_outputs.keys() if sig.structured_outputs else []
    output_key = list(output_keys)[0] if output_keys else None

    class _EncoderWrap(keras.Model):
        def __init__(self, invoke_fn, input_name_, output_key=None):
            super().__init__()
            self._invoke = invoke_fn
            self._input_name = input_name_
            self._output_key = output_key

        def call(self, x):
            out = self._invoke(**{self._input_name: x})
            if self._output_key is not None:
                return out[self._output_key]
            return list(out.values())[0]

    wrapper = _EncoderWrap(sig, input_name, output_key)
    wrapper.build((None, input_dim))
    return wrapper


def load_encoder_and_metadata(model_dir: Path):
    model_dir = Path(model_dir)
    encoder_path = model_dir / "encoder"
    encoder_keras = model_dir / "encoder.keras"
    with open(model_dir / "metadata.json", "r", encoding="utf-8") as f:
        metadata = json.load(f)
    input_dim = metadata.get("input_dim")

    if encoder_path.is_dir():
        encoder = _load_encoder_savedmodel(encoder_path, input_dim)
    elif encoder_keras.is_file():
        encoder = keras.models.load_model(encoder_keras)
    elif encoder_path.is_file():
        encoder = keras.models.load_model(encoder_path)
    else:
        raise FileNotFoundError(
            f"No encoder found in {model_dir}. Expected 'encoder/' (SavedModel), 'encoder.keras', or 'encoder' file. Run train.py first."
        )
    return encoder, metadata


def recommend(
    encoder: keras.Model,
    all_vectors: np.ndarray,
    query_vector: np.ndarray,
    uids: list[str],
    query_uid: str | None = None,
    top_k: int = 5,
    metric: str = "cosine",
) -> list[tuple[str, float]]:
    """
    Return list of (uid, score) for top-k most similar profiles.
    query_uid if set is excluded from results.
    """
    query_emb = encoder.predict(query_vector[np.newaxis, :], verbose=0)[0]
    all_embs = encoder.predict(all_vectors, verbose=0)

    if metric == "cosine":
        q = query_emb / (np.linalg.norm(query_emb) + 1e-8)
        dots = np.dot(all_embs, q)
        scores = dots
    else:
        # L2 distance (lower = more similar), negate so higher = more similar
        diffs = all_embs - query_emb
        dists = np.linalg.norm(diffs, axis=1)
        scores = -dists

    indices = np.argsort(scores)[::-1]
    out = []
    for i in indices:
        uid = uids[i]
        if uid == query_uid:
            continue
        out.append((uid, float(scores[i])))
        if len(out) >= top_k:
            break
    return out


def main():
    parser = argparse.ArgumentParser(description="Get similar-profile recommendations")
    parser.add_argument("--model-dir", type=str, default="./output", help="Path to saved encoder + metadata")
    parser.add_argument("--profiles", type=str, required=True, help="Path to full profiles JSON (for lookup and --uid)")
    parser.add_argument("--uid", type=str, default=None, help="Query by user id (from --profiles)")
    parser.add_argument("--profile", type=str, default=None, help="Path to single profile JSON (alternative to --uid)")
    parser.add_argument("--top-k", type=int, default=5, help="Number of recommendations")
    parser.add_argument("--metric", choices=["cosine", "l2"], default="cosine")
    args = parser.parse_args()

    encoder, metadata = load_encoder_and_metadata(Path(args.model_dir))
    profiles = load_profiles_from_json(args.profiles)
    if not profiles:
        raise SystemExit("No profiles found in --profiles.")

    uids = [p.uid for p in profiles]
    all_vectors = np.array([encode_profile(p) for p in profiles], dtype=np.float32)

    if args.uid:
        if args.uid not in uids:
            raise SystemExit(f"UID {args.uid} not found in --profiles.")
        idx = uids.index(args.uid)
        query_vector = all_vectors[idx]
        query_uid = args.uid
    elif args.profile:
        with open(args.profile, "r", encoding="utf-8") as f:
            raw = json.load(f)
        profile = SkillProfile.from_dict(raw if isinstance(raw, dict) else raw)
        query_vector = encode_profile(profile)
        query_uid = None
    else:
        raise SystemExit("Provide either --uid or --profile.")

    results = recommend(
        encoder, all_vectors, query_vector, uids,
        query_uid=query_uid, top_k=args.top_k, metric=args.metric,
    )
    for uid, score in results:
        print(f"  {uid}\t{score:.4f}")
    # Also output JSON for API use
    print(json.dumps([{"uid": uid, "score": score} for uid, score in results], indent=2))


if __name__ == "__main__":
    main()
