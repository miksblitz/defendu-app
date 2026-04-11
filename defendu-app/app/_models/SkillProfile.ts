// models/SkillProfile.ts

// Physical Attributes
export interface PhysicalAttributes {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  limitations?: string[]; // array of selected limitation labels
}

// Preferences
export interface Preferences {
  preferredTechnique: string[]; // Multiple selections allowed
  trainingGoal: string[]; // Multiple selections allowed
  dailyModuleTarget?: number; // 1–10 modules per day
  weeklyModuleTarget?: number; // 3–20 modules per week
}

// Past Experience
export interface PastExperience {
  experienceLevel: string;
  martialArtsBackground?: string[]; // Multiple selections allowed
  previousTrainingDetails?: string;
}

// Fitness Capabilities
export interface FitnessCapabilities {
  currentFitnessLevel: string;
  trainingFrequency: string;
  injuries?: string;
}

// Complete Skill Profile
export interface SkillProfile {
  uid: string;
  physicalAttributes: PhysicalAttributes;
  preferences: Preferences;
  pastExperience: PastExperience;
  fitnessCapabilities: FitnessCapabilities;
  completedAt: Date;
  updatedAt?: Date;
}
