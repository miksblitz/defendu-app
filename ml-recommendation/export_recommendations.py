"""
Generate recommendations for every profile and write to JSON.
Outputs similarUserIds (top-k similar users) and recommendedModuleIds (modules that
similar users completed, not yet completed by this user). When --modules is provided,
module order is merged: rank by combination of "similar users did it" and "profile–module fit".

Usage:
  cd ml-recommendation
  python export_recommendations.py --model-dir ./output --profiles profiles.json --out recommendations.json [--top-k 5]
  # With module recommendations (requires userProgress JSON from Firebase: userProgress/{uid}/completedModuleIds):
  python export_recommendations.py --model-dir ./output --profiles profiles.json --user-progress userProgress.json --out recommendations.json --top-k-users 5 --top-k-modules 10
  # Merged ranking (similar users + profile–module fit). Export modules from Firebase modules collection:
  python export_recommendations.py --model-dir ./output --profiles profiles.json --user-progress userProgress.json --modules modules.json --out recommendations.json --merge-weight 0.5 --top-k-modules 10
"""
import argparse
import json
from pathlib import Path
from collections import Counter

import numpy as np
from tensorflow import keras

from data.load_data import load_profiles_from_json, load_modules_from_json
from features.encode import encode_profile
from features.profile_module_fit import profile_module_fit
from inference import load_encoder_and_metadata, recommend


def load_user_progress(path: str | Path | None) -> dict[str, list[str]]:
    """Load { uid: completedModuleIds } from userProgress export."""
    if not path:
        return {}
    path = Path(path)
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    out = {}
    for uid, data in (raw.items() if isinstance(raw, dict) else []):
        if not isinstance(data, dict):
            continue
        ids = data.get("completedModuleIds")
        if isinstance(ids, list):
            out[uid] = [str(x) for x in ids]
        else:
            out[uid] = []
    return out


def _merged_module_scores(
    profile,
    candidate_counts: list[tuple[str, int]],
    modules_by_id: dict,
    merge_weight: float,
) -> list[tuple[str, float]]:
    """
    Rank candidate (module_id, count) by merged score: merge_weight * collab + (1 - merge_weight) * content.
    candidate_counts: list of (module_id, count) from similar users.
    modules_by_id: moduleId -> module dict for content scoring.
    Returns list of (module_id, combined_score) sorted descending.
    """
    if not candidate_counts:
        return []
    max_count = max(c for _, c in candidate_counts) or 1.0
    scored = []
    for mid, count in candidate_counts:
        collab = count / max_count
        module = modules_by_id.get(mid) if modules_by_id else None
        content = profile_module_fit(profile, module) if module else 0.5
        combined = merge_weight * collab + (1.0 - merge_weight) * content
        scored.append((mid, combined))
    scored.sort(key=lambda x: -x[1])
    return scored


def main():
    parser = argparse.ArgumentParser(description="Export recommendations for all users to JSON")
    parser.add_argument("--model-dir", type=str, default="./output", help="Path to saved encoder + metadata")
    parser.add_argument("--profiles", type=str, required=True, help="Path to profiles JSON")
    parser.add_argument("--user-progress", type=str, default=None, help="Path to userProgress JSON (uid -> completedModuleIds) for module recommendations")
    parser.add_argument("--modules", type=str, default=None, help="Path to modules JSON for profile–module fit (merge ranking)")
    parser.add_argument("--merge-weight", type=float, default=0.5, dest="merge_weight", help="Weight for collaborative score in merge (0=content only, 1=similar-users only). Default 0.5.")
    parser.add_argument("--out", type=str, default="recommendations.json", help="Output JSON path")
    parser.add_argument("--top-k-users", type=int, default=5, dest="top_k_users", help="Number of similar users per profile")
    parser.add_argument("--top-k-modules", type=int, default=10, dest="top_k_modules", help="Max recommended module IDs per user (when --user-progress provided)")
    args = parser.parse_args()

    encoder, _ = load_encoder_and_metadata(Path(args.model_dir))
    profiles = load_profiles_from_json(args.profiles)
    if not profiles:
        raise SystemExit("No profiles found.")

    uids = [p.uid for p in profiles]
    all_vectors = np.array([encode_profile(p) for p in profiles], dtype=np.float32)
    user_progress = load_user_progress(args.user_progress)
    modules_by_id = load_modules_from_json(args.modules) if args.modules else {}

    result = {}
    for i, uid in enumerate(uids):
        query_vector = all_vectors[i : i + 1]
        recs = recommend(
            encoder, all_vectors, query_vector[0], uids,
            query_uid=uid, top_k=args.top_k_users, metric="cosine",
        )
        similar_user_ids = [u for u, _ in recs]

        # Recommended modules: from similar users, not yet completed by this user; rank by merged score if modules provided
        recommended_module_ids = []
        if similar_user_ids and user_progress:
            my_completed = set(user_progress.get(uid) or [])
            counter = Counter()
            for su in similar_user_ids:
                for mid in user_progress.get(su) or []:
                    counter[mid] += 1
            candidates = [(mid, c) for mid, c in counter.most_common() if mid not in my_completed]
            if modules_by_id and candidates:
                scored = _merged_module_scores(
                    profiles[i], candidates, modules_by_id, args.merge_weight
                )
                recommended_module_ids = [mid for mid, _ in scored[: args.top_k_modules]]
            else:
                recommended_module_ids = [mid for mid, _ in candidates[: args.top_k_modules]]

        result[uid] = {
            "similarUserIds": similar_user_ids,
            "recommendedModuleIds": recommended_module_ids,
        }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Wrote recommendations for {len(result)} users to {out_path}")
    if modules_by_id:
        print("Merged ranking used (similar users + profile–module fit).")
    print("Upload each key to Firebase: recommendations/{uid} with similarUserIds and recommendedModuleIds.")


if __name__ == "__main__":
    main()
