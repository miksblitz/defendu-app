import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface TrainerReviewRow {
  trainerUid: string;
  trainerName: string;
  profilePicture?: string;
}

type Props = {
  visible: boolean;
  categoryLabel: string;
  trainers: TrainerReviewRow[];
  /** Previously saved stars (e.g. partial submit) keyed by trainer UID. */
  initialRatings?: Record<string, number>;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (ratings: { trainerUid: string; rating: number }[]) => void;
};

export default function TrainerCategoryReviewModal({
  visible,
  categoryLabel,
  trainers,
  initialRatings,
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [ratingsByTrainer, setRatingsByTrainer] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!visible) return;
    const acc: Record<string, number> = {};
    for (const t of trainers) {
      const v = initialRatings?.[t.trainerUid];
      if (typeof v === 'number' && v >= 1 && v <= 5) acc[t.trainerUid] = v;
    }
    setRatingsByTrainer(acc);
  }, [visible, trainers, initialRatings]);

  const allTrainersRated = useMemo(
    () =>
      trainers.length > 0 &&
      trainers.every((t) => {
        const r = ratingsByTrainer[t.trainerUid];
        return typeof r === 'number' && r >= 1 && r <= 5;
      }),
    [trainers, ratingsByTrainer]
  );

  const canSubmit = allTrainersRated && !submitting;

  const getInitial = (name: string) => {
    const trimmed = (name || '').trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'T';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Rate your trainers</Text>
          <Text style={styles.subtitleRow}>
            <Text style={styles.subtitlePrefix}>Rate each trainer (1-5 stars) for </Text>
            <Text style={styles.subtitleStrong}>{categoryLabel}.</Text>
            <Text style={styles.subtitlePrefix}> Submit saves when everyone has a rating.</Text>
          </Text>

          <View style={styles.listWrap}>
            {trainers.map((trainer, index) => {
              const selected = ratingsByTrainer[trainer.trainerUid] || 0;
              return (
                <View
                  key={trainer.trainerUid}
                  style={StyleSheet.flatten([styles.row, index < trainers.length - 1 && styles.rowSpaced])}
                >
                  {trainer.profilePicture ? (
                    <Image source={{ uri: trainer.profilePicture }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{getInitial(trainer.trainerName)}</Text>
                    </View>
                  )}
                  <View style={styles.rowMain}>
                    <Text style={styles.name} numberOfLines={1}>
                      {trainer.trainerName}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={`${trainer.trainerUid}-${star}`}
                          onPress={() =>
                            setRatingsByTrainer((prev) => ({
                              ...prev,
                              [trainer.trainerUid]: star,
                            }))
                          }
                          activeOpacity={0.8}
                          style={styles.starBtn}
                        >
                          <Text
                            style={StyleSheet.flatten([
                              styles.starText,
                              selected >= star ? styles.starTextActive : styles.starTextInactive,
                            ])}
                          >
                            {selected >= star ? '★' : '☆'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.skipBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={StyleSheet.flatten([styles.submitBtn, !canSubmit && styles.submitBtnDisabled])}
              disabled={!canSubmit}
              onPress={() =>
                onSubmit(trainers.map((t) => ({ trainerUid: t.trainerUid, rating: ratingsByTrainer[t.trainerUid]! })))
              }
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 10, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#011f36',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.25)',
    padding: 18,
  },
  title: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitleRow: {
    marginBottom: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  subtitlePrefix: { color: '#9bb8c7', fontSize: 13, lineHeight: 19, marginRight: 4, marginBottom: 2 },
  subtitleStrong: { color: '#d9f5ff', fontWeight: '800', marginRight: 4, marginBottom: 2 },
  listWrap: { marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(7, 187, 192, 0.2)',
    borderRadius: 12,
    backgroundColor: 'rgba(4, 32, 49, 0.9)',
    padding: 10,
  },
  rowSpaced: { marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0b2f43' },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b2f43',
  },
  avatarText: { color: '#d9f5ff', fontWeight: '800' },
  rowMain: { flex: 1, minWidth: 0, marginLeft: 10 },
  name: { color: '#eaf7fc', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  starBtn: { paddingVertical: 2, paddingRight: 3 },
  starText: { fontSize: 22, lineHeight: 24, fontWeight: '700' },
  starTextActive: { color: '#f0c14b' },
  starTextInactive: { color: '#86a4b4' },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  skipBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(155, 184, 199, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    marginRight: 10,
  },
  skipBtnText: { color: '#b8cddb', fontWeight: '700' },
  submitBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#07bbc0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#032634', fontWeight: '900' },
});

