import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Rect, Circle, G, Text as SvgText } from 'react-native-svg';
import { api } from '../services/api';
import { colors, radius, spacing } from '../theme';
import type { AnalyticsOverview } from '../types';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - spacing.md * 2 - spacing.sm * 2;

// ─── Mock data ─────────────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

const LANG_LABELS: Record<string, string> = {
  en: '🇬🇧 English', es: '🇪🇸 Spanish', fr: '🇫🇷 French', de: '🇩🇪 German',
  pt: '🇧🇷 Portuguese', ru: '🇷🇺 Russian', ar: '🇸🇦 Arabic', zh: '🇨🇳 Chinese',
  ja: '🇯🇵 Japanese', ko: '🇰🇷 Korean',
};

const MOCK: AnalyticsOverview = {
  total: 284, complaints: 38, feature_requests: 52, escalations: 12,
  avg_sentiment: -0.12, avg_latency_ms: 820, active_users: 20, returning_users: 8,
  sentiment_breakdown: [
    { sentiment: 'positive', count: 74 },
    { sentiment: 'neutral',  count: 148 },
    { sentiment: 'negative', count: 62 },
  ],
  by_intent: [
    { intent: 'general',         count: 94 },
    { intent: 'question',        count: 71 },
    { intent: 'feature_request', count: 52 },
    { intent: 'complaint',       count: 38 },
    { intent: 'support',         count: 29 },
  ],
  top_topics: [
    { topic: 'wallet',       count: 88, sentiment_avg: -0.18 },
    { topic: 'payment_card', count: 64, sentiment_avg: -0.31 },
    { topic: 'kyc',          count: 47, sentiment_avg: -0.09 },
    { topic: 'marketplace',  count: 39, sentiment_avg:  0.21 },
    { topic: 'performance',  count: 28, sentiment_avg: -0.44 },
  ],
  daily_volume: Array.from({ length: 14 }, (_, i) => ({
    date: daysAgo(13 - i),
    count: 4 + Math.floor(Math.sin(i * 0.4) * 4 + Math.random() * 8),
    avg_sentiment: parseFloat((-0.3 + Math.sin(i * 0.3) * 0.25).toFixed(3)),
  })),
  recent_complaints: [
    { id: '1', user_id: 'user-004', sentiment: 'negative', topics: '["wallet"]',       content: 'My transaction has been stuck for 3 hours', analyzed_at: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', user_id: 'user-011', sentiment: 'negative', topics: '["payment_card"]', content: 'Payment card keeps getting declined',         analyzed_at: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', user_id: 'user-007', sentiment: 'negative', topics: '["kyc"]',          content: 'KYC verification keeps failing',              analyzed_at: new Date(Date.now() - 14400000).toISOString() },
  ],
  peak_hours: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: h >= 9 && h <= 18 ? 6 + Math.floor(Math.sin((h - 9) * 0.5) * 4) : Math.floor(Math.random() * 2),
  })),
  language_breakdown: [
    { language: 'en', count: 162 },
    { language: 'es', count: 54 },
    { language: 'fr', count: 28 },
    { language: 'pt', count: 22 },
    { language: 'de', count: 18 },
  ],
};

// ─── Simple SVG line chart ─────────────────────────────────────────────────────
function LineChart({ data, xKey, yKey }: { data: any[]; xKey: string; yKey: string }) {
  const h = 120;
  const padL = 32, padB = 24, padT = 8, padR = 8;
  const w = CHART_W;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const ys = data.map(d => d[yKey] as number);
  const maxY = Math.max(...ys, 1);
  const minY = Math.min(...ys, 0);

  const xScale = (i: number) => padL + (i / (data.length - 1)) * innerW;
  const yScale = (v: number) => padT + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d[yKey])}`).join(' ');

  const tickIdxs = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <Svg width={w} height={h}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map((f, fi) => {
        const y = padT + innerH * (1 - f);
        return (
          <G key={`grid-${fi}`}>
            <Polyline points={`${padL},${y} ${w - padR},${y}`} stroke={colors.borderLight} strokeWidth={0.5} />
            <SvgText x={padL - 4} y={y + 3} fontSize={8} fill={colors.textTertiary} textAnchor="end">
              {Math.round(minY + f * (maxY - minY))}
            </SvgText>
          </G>
        );
      })}
      {/* Line */}
      <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <Circle key={i} cx={xScale(i)} cy={yScale(d[yKey])} r={2.5} fill={colors.primary} />
      ))}
      {/* X labels */}
      {tickIdxs.map(i => (
        <SvgText key={`tick-${i}`} x={xScale(i)} y={h - 4} fontSize={8} fill={colors.textTertiary} textAnchor="middle">
          {String(data[i][xKey]).slice(5)}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Simple SVG bar chart (horizontal) ────────────────────────────────────────
function HBarChart({ data, xKey, yKey, colors: barColors }: { data: any[]; xKey: string; yKey: string; colors: string[] }) {
  const barH = 20;
  const gap   = 8;
  const padL  = 90;
  const w     = CHART_W;
  const innerW = w - padL - 12;
  const maxVal = Math.max(...data.map(d => d[yKey] as number), 1);
  const h = data.length * (barH + gap) + gap;

  return (
    <Svg width={w} height={h}>
      {data.map((d, i) => {
        const barW = Math.max(4, ((d[yKey] as number) / maxVal) * innerW);
        const y = gap + i * (barH + gap);
        return (
          <G key={i}>
            <SvgText x={padL - 6} y={y + barH / 2 + 4} fontSize={10} fill={colors.textSecondary} textAnchor="end">
              {String(d[xKey]).replace('_', ' ')}
            </SvgText>
            <Rect x={padL} y={y} width={barW} height={barH} rx={4} fill={barColors[i % barColors.length]} />
            <SvgText x={padL + barW + 4} y={y + barH / 2 + 4} fontSize={10} fill={colors.textTertiary}>
              {d[yKey]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Peak hours bar chart (24 vertical bars) ──────────────────────────────────
function PeakHoursChart({ data }: { data: { hour: number; count: number }[] }) {
  const h = 80;
  const padB = 18, padT = 4;
  const w = CHART_W;
  const barW = (w / 24) - 2;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const innerH = h - padT - padB;

  return (
    <Svg width={w} height={h}>
      {data.map((d, i) => {
        const barH = Math.max(2, (d.count / maxVal) * innerH);
        const x = i * (w / 24) + 1;
        const y = padT + innerH - barH;
        const isActive = d.count >= maxVal * 0.5;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={2} fill={isActive ? colors.primary : colors.borderLight} />
            {(i === 0 || i === 6 || i === 12 || i === 18 || i === 23) && (
              <SvgText x={x + barW / 2} y={h - 2} fontSize={8} fill={colors.textTertiary} textAnchor="middle">
                {i === 0 ? '12a' : i === 6 ? '6a' : i === 12 ? '12p' : i === 18 ? '6p' : '11p'}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card:  { flex: 1, backgroundColor: colors.glassBg, borderRadius: radius.md, padding: spacing.md, minWidth: 140, borderWidth: 1, borderColor: colors.glassBorder },
  label: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  sub:   { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
});

function SectionTitle({ title }: { title: string }) {
  return <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.lg }}>{title}</Text>;
}

const TOPIC_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];

// ─── Screen ────────────────────────────────────────────────────────────────────
export function AnalyticsScreen() {
  const [mode,       setMode]       = useState<'demo' | 'live'>('live');
  const [days,       setDays]       = useState(30);
  const [data,       setData]       = useState<AnalyticsOverview | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader = true) => {
    if (mode === 'demo') { setData(MOCK); setLoading(false); return; }
    if (showLoader) setLoading(true);
    try {
      const result = await api.getAnalytics(days);
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(false); };

  const sentimentLabel = !data ? '—'
    : data.avg_sentiment > 0.2  ? '😊 Positive'
    : data.avg_sentiment < -0.2 ? '😟 Negative'
    : '😐 Neutral';

  const sentimentColor = !data ? colors.textPrimary
    : data.avg_sentiment > 0.2  ? colors.success
    : data.avg_sentiment < -0.2 ? colors.error
    : colors.textSecondary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top', 'bottom']}
    >

      {/* Mode + days toggles */}
      <View style={styles.controls}>
        <View style={styles.modeToggle}>
          {(['demo', 'live'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && (m === 'demo' ? styles.modeBtnDemo : styles.modeBtnLive)]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeBtnText, mode === m && { color: '#fff' }]}>
                {m === 'live' ? '● ' : ''}{m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.daysToggle}>
          {[7, 14, 30, 90].map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, days === d && styles.dayBtnActive]}
              onPress={() => setDays(d)}
            >
              <Text style={[styles.dayBtnText, days === d && { color: colors.primary }]}>{d}d</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => fetchData()} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : mode === 'live' && data?.total === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ fontSize: 40, marginBottom: spacing.md }}>💬</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>No live data yet</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            Start a conversation in the Chat tab to see real-time analytics populate here.
          </Text>
        </View>
      ) : !data ? null : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Stat cards */}
          <View style={styles.cardRow}>
            <StatCard label="Messages"    value={data.total.toLocaleString()} sub={`Last ${days} days`} />
            <StatCard label="Active users" value={data.active_users} sub={`${data.returning_users} returning`} color={colors.primary} />
          </View>
          <View style={styles.cardRow}>
            <StatCard label="Complaints"   value={data.complaints}       sub={`${data.total ? ((data.complaints / data.total) * 100).toFixed(1) : 0}%`} color={colors.error} />
            <StatCard label="Feature reqs" value={data.feature_requests} sub="Ideas from users" color={colors.warning} />
          </View>
          <View style={styles.cardRow}>
            <StatCard label="Escalations" value={data.escalations ?? 0} sub="Flagged for team" color={colors.error} />
            <StatCard label="Languages"   value={data.language_breakdown?.length ?? 1} sub="Detected" color={colors.info} />
          </View>
          <View style={styles.cardRow}>
            <StatCard label="Avg sentiment" value={sentimentLabel} sub={`Score: ${data.avg_sentiment.toFixed(2)}`} color={sentimentColor} />
            <StatCard label="Avg latency"   value={data.avg_latency_ms ? `${(data.avg_latency_ms / 1000).toFixed(1)}s` : '—'} sub="AI response" color={colors.info} />
          </View>

          {/* Daily volume */}
          {data.daily_volume.length > 1 && (
            <>
              <SectionTitle title="Daily message volume" />
              <View style={styles.chartCard}>
                <LineChart data={data.daily_volume} xKey="date" yKey="count" />
              </View>
            </>
          )}

          {/* Top topics */}
          {data.top_topics.length > 0 && (
            <>
              <SectionTitle title="Top topics" />
              <View style={styles.chartCard}>
                <HBarChart data={data.top_topics} xKey="topic" yKey="count" colors={TOPIC_COLORS} />
              </View>
            </>
          )}

          {/* Sentiment breakdown */}
          {data.sentiment_breakdown.length > 0 && (
            <>
              <SectionTitle title="Sentiment breakdown" />
              <View style={[styles.chartCard, { paddingVertical: spacing.md }]}>
                {data.sentiment_breakdown.map((s, i) => {
                  const total = data.sentiment_breakdown.reduce((a, b) => a + b.count, 0);
                  const pct   = total ? Math.round((s.count / total) * 100) : 0;
                  const sentimentColors: Record<string, string> = { positive: '#22c55e', neutral: '#94a3b8', negative: '#ef4444' };
                  const c = sentimentColors[s.sentiment] ?? colors.primary;
                  return (
                    <View key={`${s.sentiment}-${i}`} style={{ marginBottom: spacing.sm }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, textTransform: 'capitalize' }}>{s.sentiment}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{s.count} ({pct}%)</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: colors.bgTertiary, borderRadius: 3 }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${pct}%` as any, backgroundColor: c }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Intent breakdown */}
          {data.by_intent.length > 0 && (
            <>
              <SectionTitle title="Message intent" />
              <View style={styles.intentCard}>
                {data.by_intent.map((item, i) => {
                  const pct = data.total ? Math.round((item.count / data.total) * 100) : 0;
                  const icons: Record<string, string> = { complaint: '🔴', feature_request: '💡', question: '❓', support: '🛟', general: '💬' };
                  return (
                    <View key={item.intent} style={{ marginBottom: spacing.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                          {icons[item.intent] || '•'} {item.intent.replace('_', ' ')}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.count} ({pct}%)</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: colors.bgTertiary, borderRadius: 3 }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${pct}%` as any, backgroundColor: TOPIC_COLORS[i % TOPIC_COLORS.length] }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Peak hours */}
          {data.peak_hours && data.peak_hours.length > 0 && (
            <>
              <SectionTitle title="Peak activity hours" />
              <View style={styles.chartCard}>
                <PeakHoursChart data={data.peak_hours} />
              </View>
            </>
          )}

          {/* Language breakdown */}
          {data.language_breakdown && data.language_breakdown.length > 0 && (
            <>
              <SectionTitle title="User languages" />
              <View style={[styles.chartCard, { paddingVertical: spacing.md }]}>
                {data.language_breakdown.map((l, i) => {
                  const total = data.language_breakdown.reduce((a, b) => a + b.count, 0);
                  const pct   = total ? Math.round((l.count / total) * 100) : 0;
                  return (
                    <View key={l.language} style={{ marginBottom: i < data.language_breakdown.length - 1 ? spacing.sm : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, color: colors.textPrimary }}>{LANG_LABELS[l.language] ?? l.language.toUpperCase()}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{l.count} ({pct}%)</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: colors.bgTertiary, borderRadius: 3 }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${pct}%` as any, backgroundColor: TOPIC_COLORS[i % TOPIC_COLORS.length] }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Recent complaints */}
          {data.recent_complaints.length > 0 && (
            <>
              <SectionTitle title="Recent complaints" />
              {data.recent_complaints.map(c => {
                const topics = (() => { try { return (JSON.parse(c.topics) as string[]).join(', '); } catch { return ''; } })();
                return (
                  <View key={c.id} style={styles.complaintCard}>
                    <Text style={styles.complaintContent} numberOfLines={2}>{c.content}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 6 }}>
                      <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.badgeText, { color: '#991b1b' }]}>{c.sentiment}</Text>
                      </View>
                      {topics ? (
                        <View style={[styles.badge, { backgroundColor: colors.bgSecondary }]}>
                          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{topics}</Text>
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginLeft: 'auto' }}>
                        {new Date(c.analyzed_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  controls:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderColor: colors.border },
  modeToggle:    { flexDirection: 'row', backgroundColor: colors.bgTertiary, borderRadius: radius.md, padding: 2, gap: 2 },
  modeBtn:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm },
  modeBtnDemo:   { backgroundColor: colors.warning },
  modeBtnLive:   { backgroundColor: colors.success },
  modeBtnText:   { fontSize: 12, fontWeight: '600', color: colors.textTertiary },
  daysToggle:    { flexDirection: 'row', gap: 4 },
  dayBtn:        { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 0.5, borderColor: colors.border },
  dayBtnActive:  { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  dayBtnText:    { fontSize: 12, color: colors.textSecondary },
  scroll:        { padding: spacing.md, paddingBottom: 80 },
  cardRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chartCard:     { backgroundColor: colors.glassBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  intentCard:    { backgroundColor: colors.glassBg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  complaintCard: { backgroundColor: colors.glassBg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.glassBorder },
  complaintContent: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  badge:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  badgeText:     { fontSize: 11, fontWeight: '500' },
});
