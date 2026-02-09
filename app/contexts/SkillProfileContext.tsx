// contexts/SkillProfileContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  PhysicalAttributes,
  Preferences,
  PastExperience,
  FitnessCapabilities,
  SkillProfile,
} from '../_models/SkillProfile';
import { AuthController } from '../controllers/AuthController';

interface SkillProfileContextType {
  physicalAttributes: PhysicalAttributes | null;
  preferences: Preferences | null;
  pastExperience: PastExperience | null;
  fitnessCapabilities: FitnessCapabilities | null;
  setPhysicalAttributes: (data: PhysicalAttributes) => void;
  setPreferences: (data: Preferences) => void;
  setPastExperience: (data: PastExperience) => void;
  setFitnessCapabilities: (data: FitnessCapabilities) => void;
  clearProfile: () => void;
  loadProfile: (profile: SkillProfile) => void;
  getCompleteProfile: () => Promise<SkillProfile | null>;
}

const SkillProfileContext = createContext<SkillProfileContextType | undefined>(undefined);

export function SkillProfileProvider({ children }: { children: ReactNode }) {
  const [physicalAttributes, setPhysicalAttributesState] = useState<PhysicalAttributes | null>(null);
  const [preferences, setPreferencesState] = useState<Preferences | null>(null);
  const [pastExperience, setPastExperienceState] = useState<PastExperience | null>(null);
  const [fitnessCapabilities, setFitnessCapabilitiesState] = useState<FitnessCapabilities | null>(null);

  const setPhysicalAttributes = (data: PhysicalAttributes) => {
    setPhysicalAttributesState(data);
  };

  const setPreferences = (data: Preferences) => {
    setPreferencesState(data);
  };

  const setPastExperience = (data: PastExperience) => {
    setPastExperienceState(data);
  };

  const setFitnessCapabilities = (data: FitnessCapabilities) => {
    setFitnessCapabilitiesState(data);
  };

  const clearProfile = () => {
    setPhysicalAttributesState(null);
    setPreferencesState(null);
    setPastExperienceState(null);
    setFitnessCapabilitiesState(null);
  };

  const loadProfile = (profile: SkillProfile) => {
    setPhysicalAttributesState(profile.physicalAttributes);
    setPreferencesState(profile.preferences);
    setPastExperienceState(profile.pastExperience);
    setFitnessCapabilitiesState(profile.fitnessCapabilities);
  };

  const getCompleteProfile = async (): Promise<SkillProfile | null> => {
    if (!physicalAttributes || !preferences || !pastExperience || !fitnessCapabilities) {
      return null;
    }

    // Get current user UID
    const currentUser = await AuthController.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    return {
      uid: currentUser.uid,
      physicalAttributes,
      preferences,
      pastExperience,
      fitnessCapabilities,
      completedAt: new Date(),
    };
  };

  return (
    <SkillProfileContext.Provider
      value={{
        physicalAttributes,
        preferences,
        pastExperience,
        fitnessCapabilities,
        setPhysicalAttributes,
        setPreferences,
        setPastExperience,
        setFitnessCapabilities,
        clearProfile,
        loadProfile,
        getCompleteProfile,
      }}
    >
      {children}
    </SkillProfileContext.Provider>
  );
}

export function useSkillProfile() {
  const context = useContext(SkillProfileContext);
  if (context === undefined) {
    throw new Error('useSkillProfile must be used within a SkillProfileProvider');
  }
  return context;
}
