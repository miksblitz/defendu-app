/**
 * "Try it yourself" card: timer + rep counter with manual "Count rep" button.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Module } from '../app/_models/Module';
import { getRequiredReps } from '../app/_utils/repRange';
import { getExerciseConfig, getExerciseTypeFromModule } from '../app/_utils/exerciseDetection';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

type TryItCardProps = {
  module: Module;
  onComplete: (repCount: number) => void;
};

export default function TryItCard({ module, onComplete }: TryItCardProps) {
  const exerciseType = getExerciseTypeFromModule(module);
  const config = getExerciseConfig(exerciseType);
  const targetReps = getRequiredReps(module.repRange);
  const totalSeconds = module.trainingDurationSeconds ?? 60;

  const [repCount, setRepCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRep = () => {
    setRepCount((prev) => prev + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  useEffect(() => {
    setRemainingSeconds(totalSeconds);
    setRepCount(0);
  }, [totalSeconds]);

  useEffect(() => {
    if (paused) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [paused]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Try it yourself</Text>
      <Text style={styles.tryItSubtext}>
        Practice for {formatTime(totalSeconds)}. Tap "Count rep" when you complete each rep.
      </Text>

      <View style={styles.repCounterRow}>
        <Text style={styles.repCounterLabel}>{config.repLabel}</Text>
        <Text style={styles.repCounterValue}>{repCount} / {targetReps}</Text>
        {repCount >= targetReps && (
          <View style={styles.repGoalBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#07bbc0" />
            <Text style={styles.repGoalBadgeText}>Goal reached!</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.manualRepButton} onPress={handleRep} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={22} color="#07bbc0" style={{ marginRight: 8 }} />
        <Text style={styles.manualRepButtonText}>Count rep</Text>
      </TouchableOpacity>

      <View style={styles.timerCircleWrap}>
        <Svg width={220} height={220} style={styles.timerSvg}>
          <Circle stroke="#0a3645" fill="none" cx={110} cy={110} r={100} strokeWidth={10} />
          <Circle
            stroke="#07bbc0"
            fill="none"
            cx={110}
            cy={110}
            r={100}
            strokeWidth={10}
            strokeDasharray={`${2 * Math.PI * 100} ${2 * Math.PI * 100}`}
            strokeDashoffset={(2 * Math.PI * 100) * (1 - remainingSeconds / totalSeconds)}
            strokeLinecap="round"
            rotation="-90"
            origin="110, 110"
          />
        </Svg>
        <View style={styles.timerTextContainer}>
          <Text style={styles.timerTimeText}>{formatTime(remainingSeconds)}</Text>
          <Text style={styles.timerLabel}>time left</Text>
        </View>
      </View>

      {remainingSeconds > 0 ? (
        <>
          <TouchableOpacity
            style={styles.timerControlButton}
            onPress={() => setPaused(!paused)}
            activeOpacity={0.8}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={28} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.timerControlButtonText}>{paused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueButton} onPress={() => onComplete(repCount)} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>Finish</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.timesUpText}>Time's up!</Text>
          <Text style={styles.tryItRepsSummary}>
            You completed {repCount} {config.repLabel.toLowerCase()}{repCount !== 1 ? 's' : ''}.
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={() => onComplete(repCount)} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>Continue to Complete</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a2332',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#07bbc0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  tryItSubtext: {
    color: '#6b8693',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  repCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  repCounterLabel: { color: '#6b8693', fontSize: 16, fontWeight: '500' },
  repCounterValue: { color: '#07bbc0', fontSize: 22, fontWeight: '700' },
  repGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 187, 192, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  repGoalBadgeText: { color: '#07bbc0', fontSize: 14, fontWeight: '600' },
  manualRepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#07bbc0',
  },
  manualRepButtonText: { color: '#07bbc0', fontSize: 16, fontWeight: '600' },
  timerCircleWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  timerSvg: { alignSelf: 'center' },
  timerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTimeText: { color: '#FFFFFF', fontSize: 42, fontWeight: '700' },
  timerLabel: { color: '#6b8693', fontSize: 14, marginTop: 4 },
  timerControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  timerControlButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  continueButton: {
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  timesUpText: {
    color: '#07bbc0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  tryItRepsSummary: {
    color: '#6b8693',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
});
