import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Platform, Modal,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

type Topic = { icon: string; label: string; questions: string[] };

const QUICK_TOPICS: Topic[] = [
  {
    icon: '👁️', label: 'Attention Marketplace',
    questions: [
      'How does the Proof-of-Attention protocol work?',
      'How do I set a price for receiving messages?',
      'How do I earn from my posts and content?',
      'Why are my attention earnings not showing up?',
    ],
  },
  {
    icon: '🌟', label: 'Founding Creator',
    questions: [
      'What are the benefits of the Founding Creator program?',
      'Am I eligible to be a Founding Creator?',
      'How do I apply for the Founding Creator badge?',
      'What happens if I missed the Founding Creator window?',
    ],
  },
  {
    icon: '🪙', label: '$Alem Token',
    questions: [
      'What is the $Alem token used for?',
      'How do I invest in $Alem before listing?',
      'When will $Alem be listed on exchanges?',
      'What is the vesting schedule for $Alem?',
    ],
  },
  {
    icon: '💳', label: 'Visa Card',
    questions: [
      'How do I activate my AlemX Visa card?',
      'Why was my card transaction declined?',
      'What are the spending limits on my card?',
      'How do I get a virtual Visa card?',
    ],
  },
  {
    icon: '🔐', label: 'KYC Verification',
    questions: [
      'Why was my KYC verification rejected?',
      'What documents do I need for KYC?',
      'How long does KYC verification take?',
      'Can I reuse my KYC across partner banks?',
    ],
  },
  {
    icon: '📈', label: 'Trading & Payments',
    questions: [
      'How do I buy stocks or crypto inside AlemX?',
      'Why did my trade fail?',
      'Is trading available in my region?',
      'How do I pay for something using AlemX?',
    ],
  },
  {
    icon: '👥', label: 'P2P Transfers',
    questions: [
      'How do I send money to a contact?',
      'Can I send money using a QR code?',
      'How do I set up a recurring payment?',
      'Why did my P2P transfer fail?',
    ],
  },
  {
    icon: '🌍', label: 'Borderless Payments',
    questions: [
      'How do I send an international payment?',
      'What are the fees for cross-border transfers?',
      'How long does an international transfer take?',
      'What currencies are supported?',
    ],
  },
  {
    icon: '🏦', label: 'Partner Banks',
    questions: [
      'How do I open a bank account through AlemX?',
      'Which partner banks are available?',
      'My bank onboarding status is stuck on pending',
      'Do I need to re-submit KYC for each bank?',
    ],
  },
  {
    icon: '💡', label: 'Revenue Sharing',
    questions: [
      'How does revenue sharing work for creators?',
      'How do I set my earnings split percentage?',
      'When are creator payouts processed?',
      'Why are my revenue share earnings incorrect?',
    ],
  },
  {
    icon: '🔗', label: 'DApp & Wallet',
    questions: [
      'How do I connect my Web3 wallet to AlemX?',
      'Which wallets are supported via WalletConnect?',
      'How do I interact with a DeFi protocol?',
      'My DApp connection is not working',
    ],
  },
  {
    icon: '🗺️', label: 'City Events',
    questions: [
      'What cities is AlemX visiting in 2026?',
      'When is the AlemX Dubai conference?',
      'How do I attend an AlemX city event?',
      'How do I apply to host an event in my city?',
    ],
  },
];

// ─── Topic bottom sheet ────────────────────────────────────────────────────────
function TopicSheet({
  topic,
  onClose,
  onSend,
}: {
  topic: Topic;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState('');
  const insets = useSafeAreaInsets();

  const handleSend = (text: string) => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={sheet.kvWrap}
      >
        <View style={[sheet.panel, { paddingBottom: insets.bottom + 8 }]}>
          {/* Handle */}
          <View style={sheet.handle} />

          {/* Header */}
          <View style={sheet.header}>
            <Text style={sheet.topicIcon}>{topic.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={sheet.topicTitle}>{topic.label}</Text>
              <Text style={sheet.topicSub}>Select a question or type your own</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sheet.closeBtn}>
              <Text style={sheet.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Suggested questions */}
          <ScrollView
            style={sheet.questions}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {topic.questions.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={sheet.questionBtn}
                onPress={() => handleSend(q)}
                activeOpacity={0.7}
              >
                <Text style={sheet.questionArrow}>→</Text>
                <Text style={sheet.questionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom input */}
          <View style={sheet.inputRow}>
            <TextInput
              style={sheet.input}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask about ${topic.label}…`}
              placeholderTextColor={colors.textTertiary}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => handleSend(input)}
              autoFocus={false}
            />
            <TouchableOpacity
              style={[sheet.sendBtn, !input.trim() && sheet.sendBtnDisabled]}
              onPress={() => handleSend(input)}
              disabled={!input.trim()}
            >
              <Text style={sheet.sendBtnIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  kvWrap:        { flex: 1, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#16161f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
  },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  topicIcon:     { fontSize: 28 },
  topicTitle:    { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  topicSub:      { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  closeBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText:  { fontSize: 13, color: colors.textSecondary },
  questions:     { maxHeight: 260, marginBottom: spacing.md },
  questionBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 13, paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  questionArrow: { fontSize: 14, color: colors.primary, flexShrink: 0 },
  questionText:  { fontSize: 14, color: colors.textPrimary, flex: 1, lineHeight: 20 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  input:         { flex: 1, height: 46, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.full, paddingHorizontal: 16, fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  sendBtn:       { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnIcon:   { color: '#fff', fontSize: 20, fontWeight: '700' },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export function ConversationsScreen({
  userId,
  onSelectConversation,
}: {
  userId: string;
  onSelectConversation: (convId: string, initialMessage?: string) => void;
}) {
  const { conversations, newConversation } = useChat(userId);
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  const filtered = conversations.filter(c =>
    !search || c.first_message?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = () => {
    newConversation();
    onSelectConversation('');
  };

  const handleTopicSend = (text: string) => {
    setActiveTopic(null);
    newConversation();
    onSelectConversation('', text);
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
              <View style={styles.glowOrb} />
              <View style={styles.heroAvatar}>
                <LinearGradient
                  colors={['#818cf8', '#a78bfa']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.heroAvatarText}>AI</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.heroTitle}>AlemX Support</Text>
              <Text style={styles.heroSub}>Instant answers, any time, any language</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Online · Available 24/7</Text>
              </View>
            </View>

            {/* Start new chat CTA */}
            <TouchableOpacity style={styles.newBtnWrap} onPress={handleNew} activeOpacity={0.85}>
              <LinearGradient
                colors={['#6366f1', '#818cf8']}
                style={styles.newBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.newBtnIcon}>✦</Text>
                <Text style={styles.newBtnText}>Start New Conversation</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Quick topic chips */}
            <Text style={styles.sectionLabel}>COMMON TOPICS</Text>
            <View style={styles.topicsGrid}>
              {QUICK_TOPICS.map(t => (
                <TouchableOpacity
                  key={t.label}
                  style={styles.topicChip}
                  onPress={() => setActiveTopic(t)}
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
                    placeholder="Search conversations…"
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
              <Text style={styles.emptySub}>Tap a topic above or start a new conversation.</Text>
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

      {/* Topic sheet */}
      {activeTopic && (
        <TopicSheet
          topic={activeTopic}
          onClose={() => setActiveTopic(null)}
          onSend={handleTopicSend}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bgPrimary },
  listContent: { paddingBottom: spacing.xl + 72 },

  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  glowOrb: {
    position: 'absolute', top: 20,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.primary, opacity: 0.08,
    transform: [{ scaleX: 2 }],
  },
  heroAvatar: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, position: 'relative', overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20 },
      android: { elevation: 12 },
      web:     { boxShadow: '0 8px 24px rgba(99,102,241,0.4)' } as any,
    }),
  },
  heroAvatarText: { color: '#fff', fontSize: 24, fontWeight: '700', zIndex: 1 },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.success, borderWidth: 2.5, borderColor: colors.bgPrimary, zIndex: 2,
  },
  heroTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 6, letterSpacing: -0.3 },
  heroSub:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm, lineHeight: 20 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(52,211,153,0.1)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)',
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  statusText: { fontSize: 12, fontWeight: '600', color: colors.success },

  newBtnWrap: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderRadius: radius.lg, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 8 },
      web:     { boxShadow: '0 4px 20px rgba(99,102,241,0.35)' } as any,
    }),
  },
  newBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: radius.lg },
  newBtnIcon: { color: '#fff', fontSize: 16 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.2, marginHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.xs },

  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  topicChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.glassBg, borderRadius: radius.full,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  topicIcon:  { fontSize: 13 },
  topicLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.glassBg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, gap: 6,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  searchIcon: { fontSize: 13 },
  search:     { flex: 1, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, color: colors.textPrimary },

  itemFirst:      { borderTopWidth: 0 },
  item:           { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderTopWidth: 0.5, borderColor: colors.borderLight, gap: spacing.md, backgroundColor: colors.bgPrimary },
  itemAvatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129,140,248,0.2)' },
  itemAvatarText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemBody:       { flex: 1, minWidth: 0 },
  itemTopRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  itemTitle:      { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginRight: spacing.sm },
  itemTime:       { fontSize: 12, color: colors.textTertiary, flexShrink: 0 },
  itemMeta:       { fontSize: 12, color: colors.textTertiary },
  chevron:        { fontSize: 20, color: colors.textTertiary },

  emptyWrap:  { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.xl },
  emptyIcon:  { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
