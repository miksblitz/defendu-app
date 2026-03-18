// models/SkillProfile.ts

// Physical Attributes
export interface PhysicalAttributes {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  limitations?: string;
}

// Preferences
export interface Preferences {
  preferredTechnique: string[]; // Multiple selections allowed
  trainingGoal: string[]; // Multiple selections allowed
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
