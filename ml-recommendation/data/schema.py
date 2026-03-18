"""
Skill profile schema matching DEFENDU app models/SkillProfile.ts.
Use for loading JSON exports from Firebase or app.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PhysicalAttributes:
    height: float  # cm
    weight: float  # kg
    age: float
    gender: str  # Male | Female | Other
    limitations: Optional[str] = None


@dataclass
class Preferences:
    preferredTechnique: list[str]  # multiple
    trainingGoal: list[str]  # multiple


@dataclass
class PastExperience:
    experienceLevel: str
    martialArtsBackground: Optional[list[str]] = None
    previousTrainingDetails: Optional[str] = None


@dataclass
class FitnessCapabilities:
    currentFitnessLevel: str
    trainingFrequency: str
    injuries: Optional[str] = None


@dataclass
class SkillProfile:
    uid: str
    physicalAttributes: PhysicalAttributes
    preferences: Preferences
    pastExperience: PastExperience
    fitnessCapabilities: FitnessCapabilities
    completedAt: Optional[str] = None
    updatedAt: Optional[str] = None

    @classmethod
    def from_dict(cls, d: dict) -> "SkillProfile":
        pa = d.get("physicalAttributes", {})
        prefs = d.get("preferences", {})
        past = d.get("pastExperience", {})
        fit = d.get("fitnessCapabilities", {})

        def ensure_list(x):
            if x is None:
                return []
            return x if isinstance(x, list) else [x]

        return cls(
            uid=str(d.get("uid", "")),
            physicalAttributes=PhysicalAttributes(
                height=float(pa.get("height", 0)),
                weight=float(pa.get("weight", 0)),
                age=float(pa.get("age", 0)),
                gender=str(pa.get("gender", "Other")),
                limitations=pa.get("limitations"),
            ),
            preferences=Preferences(
                preferredTechnique=ensure_list(prefs.get("preferredTechnique")),
                trainingGoal=ensure_list(prefs.get("trainingGoal")),
            ),
            pastExperience=PastExperience(
                experienceLevel=str(past.get("experienceLevel", "")),
                martialArtsBackground=ensure_list(past.get("martialArtsBackground")),
                previousTrainingDetails=past.get("previousTrainingDetails"),
            ),
            fitnessCapabilities=FitnessCapabilities(
                currentFitnessLevel=str(fit.get("currentFitnessLevel", "")),
                trainingFrequency=str(fit.get("trainingFrequency", "")),
                injuries=fit.get("injuries"),
            ),
            completedAt=d.get("completedAt"),
            updatedAt=d.get("updatedAt"),
        )
