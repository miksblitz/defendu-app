/**
 * PoseCameraView — Web-compatible pose detection component.
 *
 * Uses the browser's WebRTC (getUserMedia) for camera access and provides
 * a manual rep-counting interface. When @mediapipe/tasks-vision is installed,
 * it can be extended to use PoseLandmarker for real pose detection.
 *
 * Props mirror the mobile PoseCameraView so both platforms share the same API.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { DEFAULT_MATCH_THRESHOLD, isRepMatch } from '../app/_utils/pose/comparator';
import type { PoseFrame, PoseSequence } from '../app/_utils/pose/types';

export interface PoseCameraViewProps {
  requiredReps: number;
  correctReps: number;
  isCurrentRepCorrect: boolean | null;
  onBack: () => void;
  onCorrectRepsUpdate: (count: number, lastRepCorrect: boolean | null) => void;
  /** Reference pose sequence (one rep). If null, practice mode: every rep counts. */
  referenceSequence: PoseSequence | null;
  /** Optional: match threshold for comparison (default 0.15). */
  matchThreshold?: number;
}

const MIN_FRAMES_FOR_REP = 5;
const MAX_BUFFER_FRAMES = 120;
const POSE_THROTTLE_MS = 100;

export default function PoseCameraView({
  requiredReps,
  correctReps,
  isCurrentRepCorrect,
  onBack,
  onCorrectRepsUpdate,
  referenceSequence,
  matchThreshold = DEFAULT_MATCH_THRESHOLD,
}: PoseCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameBufferRef = useRef<PoseFrame[]>([]);
  const lastPoseTimeRef = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Start webcam
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let cancelled = false;

    async function startCamera() {
      try {
        // Stop any previous stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setCameraReady(true);
        setCameraError(null);
      } catch (err: any) {
        if (!cancelled) {
          const msg =
            err?.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser settings.'
              : err?.name === 'NotFoundError'
                ? 'No camera found on this device.'
                : `Camera error: ${err?.message || 'Unknown error'}`;
          setCameraError(msg);
          setCameraReady(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Push a pose frame to the buffer
  const pushFrame = useCallback((frame: PoseFrame) => {
    if (frame.length === 0) return;
    const now = Date.now();
    if (now - lastPoseTimeRef.current < POSE_THROTTLE_MS) return;
    lastPoseTimeRef.current = now;
    const buf = frameBufferRef.current;
    buf.push(frame);
    while (buf.length > MAX_BUFFER_FRAMES) buf.shift();
  }, []);

  // Handle "Rep" button press — compare buffered frames against reference
  const handleRepPress = useCallback(() => {
    const buf = [...frameBufferRef.current];
    frameBufferRef.current = [];

    if (buf.length < MIN_FRAMES_FOR_REP) {
      // Not enough frames captured — still count as a rep in practice mode
      const practiceMode =
        referenceSequence == null || referenceSequence.length < MIN_FRAMES_FOR_REP;
      if (practiceMode) {
        onCorrectRepsUpdate(correctReps + 1, true);
      } else {
        onCorrectRepsUpdate(correctReps, false);
      }
      return;
    }

    const hasReference =
      referenceSequence != null && referenceSequence.length >= MIN_FRAMES_FOR_REP;

    if (hasReference) {
      const match = isRepMatch(buf, referenceSequence!, matchThreshold);
      if (match) {
        onCorrectRepsUpdate(correctReps + 1, true);
      } else {
        onCorrectRepsUpdate(correctReps, false);
      }
    } else {
      // Practice mode — every rep counts
      onCorrectRepsUpdate(correctReps + 1, true);
    }
  }, [correctReps, referenceSequence, matchThreshold, onCorrectRepsUpdate]);

  const handleSwitchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Non-web fallback
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.title}>Pose Detection</Text>
          <Text style={styles.hint}>
            Web camera pose detection is only available in the browser.
          </Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera error
  if (cameraError) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Ionicons name="videocam-off-outline" size={48} color="#e57373" />
          <Text style={styles.title}>Camera Error</Text>
          <Text style={styles.hint}>{cameraError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setCameraError(null);
              setFacingMode((f) => f); // trigger re-mount
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const practiceMode =
    referenceSequence == null || referenceSequence.length < MIN_FRAMES_FOR_REP;

  return (
    <View style={styles.container}>
      {/* Camera preview */}
      <View style={styles.cameraContainer}>
        {!cameraReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#07bbc0" />
            <Text style={styles.hint}>Starting camera...</Text>
          </View>
        )}
        {/* @ts-ignore — RNW doesn't type <video> but it renders in browser */}
        <video
          ref={videoRef as any}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            backgroundColor: '#000',
          }}
        />
      </View>

      {/* Overlay UI */}
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Keep your full body in frame</Text>
        {practiceMode && (
          <Text style={styles.practiceModeLabel}>
            Practice mode (no reference pose loaded)
          </Text>
        )}

        {/* Rep counter */}
        <View style={styles.repBox}>
          <Text style={styles.repText}>
            Correct reps: {correctReps} / {requiredReps}
          </Text>
          <View
            style={[
              styles.indicator,
              isCurrentRepCorrect === true && styles.indicatorGreen,
              isCurrentRepCorrect === false && styles.indicatorRed,
            ]}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.switchCameraButton} onPress={handleSwitchCamera}>
            <Ionicons name="camera-reverse-outline" size={20} color="#07bbc0" />
            <Text style={styles.switchCameraText}>Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.repButton} onPress={handleRepPress}>
            <Text style={styles.repButtonText}>Rep</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041527',
  },
  placeholder: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#07bbc0',
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    color: '#6b8693',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#041527',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(4, 21, 39, 0.8)',
    zIndex: 10,
    gap: 12,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(4, 21, 39, 0.65)',
  },
  overlayTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 6,
  },
  practiceModeLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginBottom: 8,
  },
  repBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  repText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  indicatorGreen: {
    backgroundColor: '#22c55e',
  },
  indicatorRed: {
    backgroundColor: '#ef4444',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#07bbc0',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  switchCameraText: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '600',
  },
  repButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  repButtonText: {
    color: '#041527',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    zIndex: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
