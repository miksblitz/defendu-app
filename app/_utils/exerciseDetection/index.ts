import type { Module } from '../../_models/Module';
import type { ExerciseType, ExerciseDetectionConfig } from './types';
import { jabConfig } from './jab';
import { hookConfig } from './hook';
import { uppercutConfig } from './uppercut';

export type { ExerciseType, ExerciseDetectionConfig };
export { jabConfig, hookConfig, uppercutConfig };

const CONFIG_MAP: Record<ExerciseType, ExerciseDetectionConfig> = {
  jab: jabConfig,
  hook: hookConfig,
  uppercut: uppercutConfig,
  other: {
    hasPoseDetection: false,
    hasAccelerometer: false,
    repLabel: 'Reps',
    poseInstruction: '',
    motionInstruction: 'Tap "Count rep" when you complete each rep.',
  },
};

/**
 * Infer exercise type from module (category/title). Used to pick detection logic and labels.
 */
export function getExerciseTypeFromModule(module: Module | null): ExerciseType {
  if (!module) return 'other';
  const cat = (module.category || '').toLowerCase();
  const title = (module.moduleTitle || '').toLowerCase();
  if (cat.includes('punch') || title.includes('jab')) return 'jab';
  if (title.includes('hook')) return 'hook';
  if (title.includes('uppercut')) return 'uppercut';
  return 'other';
}

export function getExerciseConfig(type: ExerciseType): ExerciseDetectionConfig {
  return CONFIG_MAP[type] ?? CONFIG_MAP.other;
}
