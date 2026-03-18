"""
Content-based score: how well a module fits a user's skill profile (capabilities, wants).
Returns a value in [0, 1]. Used with collaborative score in merged ranking.
"""
from typing import Any

from data.schema import SkillProfile
from config.vocabularies import (
    EXPERIENCE_LEVELS,
    CURRENT_FITNESS_LEVELS,
    PREFERRED_TECHNIQUES,
    TRAINING_GOALS,
)

# Tags that may conflict with limitations/injuries (reduce score if user has limitations)
HIGH_DEMAND_TAGS = {"Power", "Speed", "Agility", "Endurance", "Strength"}

# Categories that primarily require arms vs legs (for limb-difference / limitations)
ARM_CATEGORIES = {"punching", "palm strikes", "elbow strikes"}
LEG_CATEGORIES = {"kicking", "knee strikes"}


def _level_to_15(level: str, levels: list[str]) -> float:
    """Map a single-choice level to 1–5 scale (1=lowest, 5=highest)."""
    if not level or level not in levels:
        return 3.0
    idx = levels.index(level)
    # Linear map 0..len-1 -> 1..5
    n = len(levels)
    if n <= 1:
        return 3.0
    return 1.0 + (idx / (n - 1)) * 4.0


def profile_module_fit(profile: SkillProfile, module: dict[str, Any]) -> float:
    """
    Score how well this module fits the user's profile (capabilities + wants).
    Returns float in [0, 1]. Higher = better fit.
    """
    if not module:
        return 0.5

    intensity = int(module.get("intensityLevel", 3))
    intensity = max(1, min(5, intensity))
    physical_demand_tags = set(
        str(t).strip() for t in (module.get("physicalDemandTags") or [])
    )
    category = (module.get("category") or "").strip().lower()

    # Preferred intensity: max of experience and fitness (allow "slightly challenging")
    exp_num = _level_to_15(
        profile.pastExperience.experienceLevel, EXPERIENCE_LEVELS
    )
    fit_num = _level_to_15(
        profile.fitnessCapabilities.currentFitnessLevel, CURRENT_FITNESS_LEVELS
    )
    preferred = max(exp_num, fit_num)
    # Best fit: module intensity <= preferred + 1 (don't recommend much harder)
    diff = abs(intensity - preferred)
    if intensity > preferred + 1:
        intensity_score = 0.3  # too hard
    else:
        intensity_score = 1.0 - 0.2 * diff  # 1.0 if exact, 0.8 if ±1, etc.

    # Wants: category / technique alignment (category often reflects technique)
    technique_score = 0.5
    for t in profile.preferences.preferredTechnique or []:
        if t and t.lower() in category:
            technique_score = 1.0
            break
    goals_score = 0.5
    for g in profile.preferences.trainingGoal or []:
        if g and g.lower() in category:
            goals_score = 1.0
            break
    wants_score = (technique_score + goals_score) / 2.0

    # Capabilities: penalize high-demand modules if user has limitations/injuries
    limitations_text = (
        (profile.physicalAttributes.limitations or "")
        + " "
        + (profile.fitnessCapabilities.injuries or "")
    ).lower()
    has_limitations = bool(
        (profile.physicalAttributes.limitations or "").strip()
        or (profile.fitnessCapabilities.injuries or "").strip()
    )

    capability_penalty = 1.0
    if has_limitations and physical_demand_tags & HIGH_DEMAND_TAGS:
        capability_penalty = 0.7

    # Limb-specific: prioritize (reorder) only — don't filter. Users who can't use arms get
    # leg-based modules ranked higher; arm modules still appear but lower in the list. Same for no legs.
    no_arms = any(
        phrase in limitations_text
        for phrase in (
            "no arm",
            "no use of arm",
            "without arm",
            "limited arm",
            "arms limited",
            "no arms",
        )
    )
    no_legs = any(
        phrase in limitations_text
        for phrase in (
            "no leg",
            "no use of leg",
            "without leg",
            "limited leg",
            "legs limited",
            "no legs",
            "wheelchair",
            "no use of legs",
        )
    )
    # If they said "upper body only" they have arms, not legs — so avoid leg modules
    if "upper body only" in limitations_text or "wheelchair" in limitations_text:
        no_legs = True
        no_arms = False
    if "no use of arms" in limitations_text or "no arms" in limitations_text:
        no_arms = True
    if "no use of legs" in limitations_text or "no legs" in limitations_text:
        no_legs = True

    if no_arms and category in ARM_CATEGORIES:
        capability_penalty = min(capability_penalty, 0.4)  # downrank so leg modules are prioritized; arm modules still in list
    if no_legs and category in LEG_CATEGORIES:
        capability_penalty = min(capability_penalty, 0.4)  # downrank so arm modules prioritized; leg modules still in list

    # Combined: weight intensity and wants, then apply penalty
    combined = 0.6 * intensity_score + 0.4 * wants_score
    return max(0.0, min(1.0, combined * capability_penalty))
