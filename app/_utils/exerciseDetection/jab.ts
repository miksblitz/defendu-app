import type { ExerciseDetectionConfig } from './types';

export const jabConfig: ExerciseDetectionConfig = {
  hasPoseDetection: false,
  hasAccelerometer: false,
  repLabel: 'Perfect jabs',
  poseInstruction: '',
  motionInstruction: 'Tap "Count rep" when you complete each jab.',
};
