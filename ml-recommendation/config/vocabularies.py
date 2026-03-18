"""
Categorical vocabularies for DEFENDU skill profiles.
Must stay in sync with the app: physicalAttributesQuestion, preferencesQuestions,
pastexperienceQuestion, fitnessCapabilitiesQuestion.
"""

# Physical attributes (physicalAttributesQuestion)
GENDERS = ["Male", "Female", "Other"]

# Preferences (preferencesQuestions)
PREFERRED_TECHNIQUES = [
    "Punching",
    "Kicking",
    "Palm Strikes",
    "Elbow Strikes",
    "Knee Strikes",
    "Defensive Moves",
]
TRAINING_GOALS = [
    "Personal Safety",
    "Fitness",
    "Confidence Building",
]

# Past experience (pastexperienceQuestion)
EXPERIENCE_LEVELS = [
    "Complete Beginner",
    "Some Experience",
    "Experienced",
    "Expert/Instructor",
]
MARTIAL_ARTS_OPTIONS = [
    "Boxing",
    "Brazilian Jiu-Jitsu (BJJ)",
    "MMA (Mixed Martial Arts)",
    "Taekwondo (TKD)",
    "Muay Thai",
    "Wushu",
    "Karate",
    "Judo",
    "Wrestling",
    "Kickboxing",
    "Krav Maga",
    "Aikido",
    "Capoeira",
    "Kung Fu",
    "Jiu-Jitsu",
    "Sambo",
    "Savate",
    "Other",
]
EXPERIENCE_DURATIONS = [
    "None",
    "1-6 months",
    "7-12 months",
    "1-2 years",
    "3-5 years",
    "5-10 years",
    "Over 10 years",
]

# Fitness capabilities (fitnessCapabilitiesQuestion)
CURRENT_FITNESS_LEVELS = ["Low", "Moderate", "High", "Athlete"]
TRAINING_FREQUENCIES = [
    "Never",
    "1-2 times per week",
    "3-4 times per week",
    "Daily",
]

# Normalization ranges for numerical features (from app validation)
HEIGHT_RANGE = (80, 250)   # cm
WEIGHT_RANGE = (15, 300)   # kg
AGE_RANGE = (4, 120)
