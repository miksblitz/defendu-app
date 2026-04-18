import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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

  const openModule = (moduleId: string, status: string) => {
    const approved = String(status).trim().toLowerCase() === 'approved';
    if (approved) {
      router.push({ pathname: '/view-module', params: { moduleId } });
      return;
    }
    const msg = `Status: ${statusLabel(status)}. Learners only see approved modules. Use Publish new module to update your submission.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(msg);
    } else {
      Alert.alert('Not public yet', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#07bbc0" />
          <Text style={styles.backText}>Published modules</Text>
        </TouchableOpacity>

        <Text style={styles.lead}>
          Modules tied to your trainer account in the database. Tap a row to open an approved module, or use the
          button below to create or update a submission.
        </Text>

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
            <TouchableOpacity
              key={m.moduleId}
              style={styles.row}
              onPress={() => openModule(m.moduleId, m.status)}
              activeOpacity={0.85}
            >
              {m.thumbnailUrl ? (
                <Image source={{ uri: m.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name="albums-outline" size={22} color="#6b8693" />
                </View>
              )}
              <View style={styles.rowBody}>
                <Text style={styles.title} numberOfLines={2}>
                  {m.moduleTitle}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {m.category || '—'} · {statusLabel(m.status)}
                </Text>
                <Text style={styles.idHint} numberOfLines={1}>
                  {m.moduleId}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b8693" />
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: { color: '#e9f7ff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  lead: { color: 'rgba(200, 228, 236, 0.9)', fontSize: 14, lineHeight: 22, marginBottom: 16 },
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
    alignItems: 'center',
    backgroundColor: 'rgba(7,187,192,0.05)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.1)',
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#021422' },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#021422',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  meta: { color: '#6b8693', fontSize: 12, marginTop: 4 },
  idHint: { color: 'rgba(107,134,147,0.7)', fontSize: 11, marginTop: 4 },
});
