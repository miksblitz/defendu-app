import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthController } from '../controllers/AuthController';

function statusLabel(status: string): string {
  const s = (status || '').trim();
  if (!s) return 'Unknown';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PublishedModulesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof AuthController.getMyTrainerPublishedModulesList>>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await AuthController.getCurrentUser();
      if (!user || user.role !== 'trainer' || !user.trainerApproved) {
        setError('Trainer access required.');
        setItems([]);
        return;
      }
      const list = await AuthController.getMyTrainerPublishedModulesList();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load modules');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEditor = (moduleId: string) => {
    router.push({ pathname: '/publish-module', params: { moduleId } });
  };

  const openPreview = (moduleId: string, status: string) => {
    const approved = String(status).trim().toLowerCase() === 'approved';
    if (!approved) {
      Alert.alert('Preview unavailable', 'Only approved modules can be previewed by learners.');
      return;
    }
    router.push({ pathname: '/view-module', params: { moduleId } });
  };

  const getStatusColor = (status: string): string => {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'approved') return '#35d8a6';
    if (normalized === 'rejected') return '#ff7d7d';
    if (normalized === 'pending review') return '#f8be52';
    return '#8bb6c7';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#07bbc0" />
          <Text style={styles.backText}>Published modules</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Trainer Studio</Text>
          <Text style={styles.lead}>
            Click any module card to edit it in detail. Trainers can now update their published modules like admin-level
            editing. Use Preview to check the learner experience.
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>Total</Text>
              <Text style={styles.statPillValue}>{items.length}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>Approved</Text>
              <Text style={styles.statPillValue}>
                {items.filter((m) => m.status.trim().toLowerCase() === 'approved').length}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/publish-module')} activeOpacity={0.88}>
          <Ionicons name="add-circle-outline" size={22} color="#041527" style={styles.primaryBtnIcon} />
          <Text style={styles.primaryBtnText}>Publish new module</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#07bbc0" />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>You do not have any modules in trainerModules yet. Publish one to see it here.</Text>
        ) : (
          items.map((m) => (
            <TouchableOpacity key={m.moduleId} style={styles.row} onPress={() => openEditor(m.moduleId)} activeOpacity={0.9}>
              <View style={styles.thumbWrap}>
                {m.thumbnailUrl ? (
                  <Image source={{ uri: m.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name="albums-outline" size={22} color="#6b8693" />
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(m.status) }]}>
                  <Text style={styles.statusText}>{statusLabel(m.status)}</Text>
                </View>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.title} numberOfLines={2}>
                  {m.moduleTitle}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {m.category || 'Uncategorized'}
                </Text>
                <Text style={styles.idHint} numberOfLines={1}>
                  {m.moduleId}
                </Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => openEditor(m.moduleId)} activeOpacity={0.86}>
                    <Ionicons name="create-outline" size={16} color="#07bbc0" />
                    <Text style={styles.secondaryBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ghostBtn}
                    onPress={() => openPreview(m.moduleId, m.status)}
                    activeOpacity={0.86}
                  >
                    <Ionicons name="eye-outline" size={16} color="#9fd4e6" />
                    <Text style={styles.ghostBtnText}>Preview</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Ionicons name="chevron-forward-circle" size={24} color="#07bbc0" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#041527' },
  content: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: 'rgba(7,187,192,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.26)',
    padding: 14,
    marginBottom: 16,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: { color: '#e9f7ff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  lead: { color: 'rgba(200, 228, 236, 0.9)', fontSize: 14, lineHeight: 22, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    backgroundColor: 'rgba(3, 22, 36, 0.86)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statPillLabel: { color: '#8fb2bf', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 },
  statPillValue: { color: '#e6fbff', fontSize: 18, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07bbc0',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  primaryBtnIcon: { marginRight: 8 },
  primaryBtnText: { color: '#041527', fontWeight: '700', fontSize: 15 },
  centered: { paddingVertical: 48, alignItems: 'center' },
  errorCard: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
  },
  errorText: { color: '#ffb4b4', fontSize: 14, marginTop: 10 },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(7,187,192,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: { color: '#07bbc0', fontWeight: '700' },
  empty: { color: '#6b8693', fontSize: 14, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(7,187,192,0.07)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.2)',
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#021422' },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#021422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  statusText: { color: '#041527', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  rowBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  meta: { color: '#8db7c8', fontSize: 12, marginTop: 4 },
  idHint: { color: 'rgba(107,134,147,0.7)', fontSize: 11, marginTop: 4 },
  rowActions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.4)',
    backgroundColor: 'rgba(7,187,192,0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  secondaryBtnText: { color: '#07bbc0', fontSize: 12, fontWeight: '700' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(159,212,230,0.4)',
    backgroundColor: 'rgba(159,212,230,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ghostBtnText: { color: '#9fd4e6', fontSize: 12, fontWeight: '700' },
});
