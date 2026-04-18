import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getTrainerPublishedModuleAnalytics,
  type TrainerModuleAnalyticsRow,
} from '../../lib/controllers/trainerAnalytics';

function formatDate(ts: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '—';
  }
}

export default function TrainerInsightModuleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ moduleId: string | string[] }>();
  const moduleIdRaw = params.moduleId;
  const moduleId =
    typeof moduleIdRaw === 'string'
      ? moduleIdRaw
      : Array.isArray(moduleIdRaw)
        ? moduleIdRaw[0]
        : '';
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<TrainerModuleAnalyticsRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!moduleId) {
      setError('Missing module');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const data = await getTrainerPublishedModuleAnalytics();
    if (!data.success) {
      setError(data.error || 'Could not load');
      setRow(null);
    } else {
      const found = data.modules.find((m) => m.moduleId === moduleId) || null;
      setRow(found);
      if (!found) setError('Module not found in your approved catalog or no data yet.');
    }
    setLoading(false);
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#07bbc0" />
          <Text style={styles.backText}>Module insights</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#07bbc0" />
          </View>
        ) : error && !row ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : row ? (
          <>
            <View style={styles.hero}>
              {row.thumbnailUrl ? (
                <Image source={{ uri: row.thumbnailUrl }} style={styles.heroImg} />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Ionicons name="albums-outline" size={36} color="#6b8693" />
                </View>
              )}
              <View style={styles.heroText}>
                <Text style={styles.title} numberOfLines={3}>
                  {row.moduleTitle}
                </Text>
                <Text style={styles.cat}>{row.category || '—'}</Text>
              </View>
            </View>

            <View style={styles.grid}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{row.buyers}</Text>
                <Text style={styles.statLabel}>Buyers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{row.creditsGross}</Text>
                <Text style={styles.statLabel}>Credits (gross)</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{row.avgCreditsPerBuyer}</Text>
                <Text style={styles.statLabel}>Avg credits / buyer</Text>
              </View>
              <View style={[styles.stat, styles.statWide]}>
                <Text style={styles.statValSmall}>{formatDate(row.lastPurchasedAt)}</Text>
                <Text style={styles.statLabel}>Last sale</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#041527' },
  content: { padding: 20, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#e9f7ff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  centered: { paddingVertical: 48, alignItems: 'center' },
  errorCard: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
  },
  errorText: { color: '#ffb4b4', fontSize: 14 },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(7,187,192,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: { color: '#07bbc0', fontWeight: '700' },
  hero: {
    flexDirection: 'row',
    marginBottom: 22,
    alignItems: 'center',
  },
  heroImg: { width: 100, height: 100, borderRadius: 14, backgroundColor: '#021422', marginRight: 14 },
  heroPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#021422',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  cat: { color: '#6b8693', fontSize: 14, marginTop: 8, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  stat: {
    width: '31%',
    backgroundColor: 'rgba(7,187,192,0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.12)',
    margin: 5,
  },
  statWide: { width: '100%' },
  statVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  statValSmall: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  statLabel: { color: '#6b8693', fontSize: 11, marginTop: 6, fontWeight: '600' },
});
