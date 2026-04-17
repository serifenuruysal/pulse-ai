import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput,
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations…"
          placeholderTextColor={colors.textTertiary}
          clearButtonMode="while-editing"
        />
      </View>

      {/* New conversation button */}
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => { newConversation(); onSelectConversation(''); }}
      >
        <Text style={styles.newBtnText}>+ New Conversation</Text>
      </TouchableOpacity>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
              {search ? 'No matches' : 'No conversations yet'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelectConversation(item.id)}>
            <View style={styles.itemIcon}>
              <Text style={{ fontSize: 16 }}>💬</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.first_message || 'New conversation'}
              </Text>
              <Text style={styles.itemMeta}>
                {item.message_count} messages · {relativeTime(item.updated_at)}
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
  searchRow:   { padding: spacing.md, borderBottomWidth: 0.5, borderColor: colors.border },
  search:      { backgroundColor: colors.bgSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, fontSize: 15, color: colors.textPrimary },
  newBtn:      { margin: spacing.md, padding: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center' },
  newBtnText:  { color: '#fff', fontWeight: '600', fontSize: 15 },
  item:        { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 0.5, borderColor: colors.borderLight, gap: spacing.md },
  itemIcon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  itemTitle:   { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  itemMeta:    { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  chevron:     { fontSize: 20, color: colors.textTertiary },
});
