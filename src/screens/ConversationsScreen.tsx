import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat } from '../hooks/useChat';
import { colors, radius, spacing } from '../theme';

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const QUICK_TOPICS = [
  { icon: '👁️', label: 'Attention Marketplace' },
  { icon: '🌟', label: 'Founding Creator' },
  { icon: '🪙', label: '$Alem Token' },
  { icon: '💳', label: 'Visa Card' },
  { icon: '🔐', label: 'KYC Verification' },
  { icon: '📈', label: 'Trading & Payments' },
  { icon: '👥', label: 'P2P Transfers' },
  { icon: '🌍', label: 'Borderless Payments' },
  { icon: '🏦', label: 'Partner Banks' },
  { icon: '💡', label: 'Revenue Sharing' },
  { icon: '🔗', label: 'DApp & Wallet' },
  { icon: '🗺️', label: 'City Events' },
];

export function ConversationsScreen({
  userId,
  onSelectConversation,
}: {
  userId: string;
  onSelectConversation: (convId: string) => void;
}) {
  const { conversations, newConversation } = useChat(userId);
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c =>
    !search || c.first_message?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = () => {
    newConversation();
    onSelectConversation('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Hero header */}
            <View style={styles.hero}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>AI</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.heroTitle}>Support Assistant</Text>
              <Text style={styles.heroSub}>
                We typically reply in under a minute
              </Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Online · Available 24/7</Text>
              </View>
            </View>

            {/* Start new chat CTA */}
            <TouchableOpacity style={styles.newBtn} onPress={handleNew} activeOpacity={0.85}>
              <Text style={styles.newBtnIcon}>✦</Text>
              <Text style={styles.newBtnText}>Start New Conversation</Text>
            </TouchableOpacity>

            {/* Quick topic chips */}
            <Text style={styles.sectionLabel}>COMMON TOPICS</Text>
            <View style={styles.topicsGrid}>
              {QUICK_TOPICS.map(t => (
                <TouchableOpacity
                  key={t.label}
                  style={styles.topicChip}
                  onPress={handleNew}
                  activeOpacity={0.7}
                >
                  <Text style={styles.topicIcon}>{t.icon}</Text>
                  <Text style={styles.topicLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search + past chats header */}
            {conversations.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>PREVIOUS CONVERSATIONS</Text>
                <View style={styles.searchWrap}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.search}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search your conversations…"
                    placeholderTextColor={colors.textTertiary}
                    clearButtonMode="while-editing"
                  />
                </View>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          conversations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>Tap "Start New Conversation" above to get help instantly.</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No matches found</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.item, index === 0 && styles.itemFirst]}
            onPress={() => onSelectConversation(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.itemAvatar}>
              <Text style={styles.itemAvatarText}>AI</Text>
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemTopRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.first_message || 'New conversation'}
                </Text>
                <Text style={styles.itemTime}>{relativeTime(item.updated_at)}</Text>
              </View>
              <Text style={styles.itemMeta}>
                {item.message_count} {item.message_count === 1 ? 'message' : 'messages'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bgPrimary },
  listContent: { paddingBottom: spacing.xl + 16 },

  // Hero
  hero:           { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.xl, backgroundColor: colors.bgPrimary },
  heroAvatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, position: 'relative' },
  heroAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  onlineDot:      { position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.bgPrimary },
  heroTitle:      { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  heroSub:        { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  statusDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  statusText:     { fontSize: 12, fontWeight: '600', color: '#16a34a' },

  // New CTA
  newBtn:     { marginHorizontal: spacing.lg, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, ...Platform.select({ ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 }, android: { elevation: 6 } }) },
  newBtnIcon: { color: '#fff', fontSize: 16 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.8, marginHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.xs },

  // Topics grid
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  topicChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgSecondary, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  topicIcon:  { fontSize: 14 },
  topicLabel: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },

  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.bgSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, gap: 6 },
  searchIcon: { fontSize: 13 },
  search:     { flex: 1, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, color: colors.textPrimary },

  // List items
  itemFirst:      { borderTopWidth: 0 },
  item:           { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 0.5, borderColor: colors.borderLight, gap: spacing.md, backgroundColor: colors.bgPrimary },
  itemAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  itemAvatarText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemBody:       { flex: 1, minWidth: 0 },
  itemTopRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemTitle:      { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginRight: spacing.sm },
  itemTime:       { fontSize: 12, color: colors.textTertiary, flexShrink: 0 },
  itemMeta:       { fontSize: 12, color: colors.textTertiary },
  chevron:        { fontSize: 20, color: colors.textTertiary },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.xl },
  emptyIcon:  { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
