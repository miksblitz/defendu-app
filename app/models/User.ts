// models/User.ts
export type UserRole = 'individual' | 'trainer' | 'admin';

export interface User {
  uid: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  profilePicture?: string;
  role: UserRole;
  hasCompletedSkillProfile: boolean;
  subscriptionStatus?: string;
  trainerApproved?: boolean;
  // Physical Attributes
  height?: number; // cm
  weight?: number; // kg
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  physicalLimitations?: string;
  // Preferences
  preferredTechnique?: string[]; // Multiple selections allowed
  trainingGoal?: string[]; // Multiple selections allowed
  // Past Experience
  experienceLevel?: string;
  martialArtsBackground?: string[]; // Multiple selections allowed
  previousTrainingDetails?: string;
  // Fitness Capabilities
  currentFitnessLevel?: string;
  trainingFrequency?: string;
  currentInjuries?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}