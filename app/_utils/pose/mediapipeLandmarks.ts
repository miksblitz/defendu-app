/**
 * Map MediaPipe JS landmark format to our PoseFrame.
 * Works with @mediapipe/tasks-vision (web) and similar formats.
 */

import type { PoseFrame } from './types';

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Convert landmarks array to PoseFrame (PoseLandmark[]).
 * Works with @mediapipe/tasks-vision result format.
 */
export function mediaPipeResultToFrame(landmarks: MediaPipeLandmark[]): PoseFrame {
  if (!Array.isArray(landmarks)) return [];
  return landmarks.map((m) => ({
    x: m.x,
    y: m.y,
    z: m.z,
    visibility: m.visibility,
  })) as PoseFrame;
}
