/**
 * Exercise types for "Try it yourself" rep detection.
 * Each type can have its own detection logic (pose, accelerometer, or manual only).
 */
export type ExerciseType = 'jab' | 'hook' | 'uppercut' | 'other';

export interface ExerciseDetectionConfig {
  /** Whether this exercise supports camera pose detection. */
  hasPoseDetection: boolean;
  /** Whether this exercise supports accelerometer fallback. */
  hasAccelerometer: boolean;
  /** Label for rep counter (e.g. "Perfect jabs", "Hooks", "Uppercuts"). */
  repLabel: string;
  /** Short instruction when pose is active. */
  poseInstruction: string;
  /** Short instruction when only motion/manual is used. */
  motionInstruction: string;
}
