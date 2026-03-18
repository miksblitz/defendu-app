"""
Load skill profiles and modules from JSON (e.g. Firebase export or app export).
Profiles: array or object keyed by uid.
Modules: object keyed by moduleId, or array of modules with moduleId.
"""
import json
from pathlib import Path
from typing import Any, Dict, List

from .schema import SkillProfile


def _ensure_list(x: Any) -> list:
    if x is None:
        return []
    return list(x) if isinstance(x, (list, tuple)) else [x]


def load_profiles_from_json(path: str | Path) -> List[SkillProfile]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Profile data file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    profiles: List[SkillProfile] = []

    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict) and item.get("physicalAttributes"):
                try:
                    profiles.append(SkillProfile.from_dict(item))
                except Exception as e:
                    print(f"Skipping invalid profile: {e}")
        return profiles

    if isinstance(raw, dict):
        for uid, data in raw.items():
            if not isinstance(data, dict):
                continue
            data = {**data, "uid": uid}
            if data.get("physicalAttributes"):
                try:
                    profiles.append(SkillProfile.from_dict(data))
                except Exception as e:
                    print(f"Skipping invalid profile {uid}: {e}")
        return profiles

    return profiles


def load_modules_from_json(path: str | Path) -> Dict[str, Dict[str, Any]]:
    """
    Load modules from JSON. Returns { moduleId: module_dict }.
    Expected formats:
      - Object keyed by moduleId: { "id1": { moduleId, intensityLevel, ... }, ... }
      - Array: [ { moduleId, intensityLevel, ... }, ... ]
    Only approved (or at least non-draft) modules are typically exported.
    """
    path = Path(path)
    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    out: Dict[str, Dict[str, Any]] = {}
    if isinstance(raw, dict):
        for kid, data in raw.items():
            if not isinstance(data, dict):
                continue
            mid = str(data.get("moduleId", kid))
            out[mid] = {
                "moduleId": mid,
                "intensityLevel": int(data.get("intensityLevel", 3)),
                "physicalDemandTags": _ensure_list(data.get("physicalDemandTags")),
                "spaceRequirements": _ensure_list(data.get("spaceRequirements")),
                "category": str(data.get("category", "")),
            }
        return out
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            mid = str(item.get("moduleId", ""))
            if not mid:
                continue
            out[mid] = {
                "moduleId": mid,
                "intensityLevel": int(item.get("intensityLevel", 3)),
                "physicalDemandTags": _ensure_list(item.get("physicalDemandTags")),
                "spaceRequirements": _ensure_list(item.get("spaceRequirements")),
                "category": str(item.get("category", "")),
            }
        return out
    return {}
