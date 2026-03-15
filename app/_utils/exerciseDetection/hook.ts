import type { ExerciseDetectionConfig } from './types';

/** Hook: curved punch from the side. Pose/accelerometer not implemented yet; manual count only. */
export const hookConfig: ExerciseDetectionConfig = {
  hasPoseDetection: false,
  hasAccelerometer: false,
  repLabel: 'Hooks',
  poseInstruction: '',
  motionInstruction: 'Tap "Count rep" when you complete each hook.',
};
