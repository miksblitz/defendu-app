import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

export default function TrainerInsightsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ modules: 0, buyers: 0, creditsGross: 0 });
  const [rows, setRows] = useState<TrainerModuleAnalyticsRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await getTrainerPublishedModuleAnalytics();
    if (!data.success) {
      setError(data.error || 'Could not load insights');
      setRows([]);
      setTotals({ modules: 0, buyers: 0, creditsGross: 0 });
    } else {
      setTotals(data.totals);
      setRows(data.modules);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const top = rows[0];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#07bbc0" />
          <Text style={styles.backText}>Trainer insights</Text>
        </TouchableOpacity>

        <Text style={styles.lead}>
          Sales and reach for your approved modules. Totals use purchase records across all learners.
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#07bbc0" />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={22} color="#ff6b6b" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.kpiRow}>
              <View style={[styles.kpi, styles.kpiSpacing]}>
                <Text style={styles.kpiVal}>{totals.modules}</Text>
                <Text style={styles.kpiLabel}>Approved modules</Text>
              </View>
              <View style={[styles.kpi, styles.kpiSpacing]}>
                <Text style={styles.kpiVal}>{totals.buyers}</Text>
                <Text style={styles.kpiLabel}>Unique buyers</Text>
              </View>
              <View style={styles.kpi}>
                <Text style={styles.kpiVal}>{totals.creditsGross}</Text>
                <Text style={styles.kpiLabel}>Credits sold</Text>
              </View>
            </View>

            {top && (
              <View style={styles.topCard}>
                <Text style={styles.topTitle}>Top module</Text>
                <Text style={styles.topName} numberOfLines={2}>
                  {top.moduleTitle}
                </Text>
                <Text style={styles.topMeta}>
                  {top.creditsGross} credits • {top.buyers} buyer{top.buyers !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            <Text style={styles.listHeading}>All modules (by credits)</Text>
            {rows.length === 0 ? (
              <Text style={styles.empty}>No approved modules yet, or no purchases recorded.</Text>
            ) : (
              rows.map((m) => (
                <TouchableOpacity
                  key={m.moduleId}
                  style={styles.rowCard}
                  onPress={() =>
                    router.push({
                      pathname: '/trainer-insight-module',
                      params: { moduleId: m.moduleId },
                    })
                  }
                  activeOpacity={0.85}
                >
                  {m.thumbnailUrl ? (
                    <Image source={{ uri: m.thumbnailUrl }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="film-outline" size={22} color="#6b8693" />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {m.moduleTitle}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {m.category || '—'} · {m.buyers} buyers · {m.creditsGross} credits
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b8693" />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#041527' },
  content: { padding: 20, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { color: '#e9f7ff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  lead: { color: 'rgba(200, 228, 236, 0.9)', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  centered: { paddingVertical: 48, alignItems: 'center' },
  errorCard: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
  },
  errorIcon: { marginBottom: 10 },
  errorText: { color: '#ffb4b4', fontSize: 14, flex: 1 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(7,187,192,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: { color: '#07bbc0', fontWeight: '700' },
  kpiRow: { flexDirection: 'row', marginBottom: 18 },
  kpiSpacing: { marginRight: 8 },
  kpi: {
    flex: 1,
    backgroundColor: 'rgba(7,187,192,0.06)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.12)',
  },
  kpiVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: '#6b8693', fontSize: 11, marginTop: 4, fontWeight: '600' },
  topCard: {
    backgroundColor: 'rgba(7,187,192,0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(7,187,192,0.2)',
  },
  topTitle: { color: '#07bbc0', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  topName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  topMeta: { color: 'rgba(200, 228, 236, 0.85)', fontSize: 13, marginTop: 8 },
  listHeading: { color: '#e9f7ff', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#6b8693', fontSize: 14 },
  rowCard: {
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
  rowText: { flex: 1, marginHorizontal: 12 },
  rowTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#6b8693', fontSize: 12, marginTop: 4 },
});
