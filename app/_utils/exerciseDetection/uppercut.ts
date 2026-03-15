import type { ExerciseDetectionConfig } from './types';

/** Uppercut: punch moving upward. Pose/accelerometer not implemented yet; manual count only. */
export const uppercutConfig: ExerciseDetectionConfig = {
  hasPoseDetection: false,
  hasAccelerometer: false,
  repLabel: 'Uppercuts',
  poseInstruction: '',
  motionInstruction: 'Tap "Count rep" when you complete each uppercut.',
};
