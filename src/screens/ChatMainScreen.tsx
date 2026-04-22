import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Platform, Animated,
  Dimensions, KeyboardAvoidingView, ScrollView, Modal, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useChat } from '../hooks/useChat';
import { colors, radius, spacing } from '../theme';
import type { Message } from '../types';

// ─── Responsive helpers ───────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const isSmallPhone  = SCREEN_W < 375;                        // iPhone SE
const isTablet      = SCREEN_W >= 768;
const SIDEBAR_W     = isTablet ? 320 : SCREEN_W * 0.82;     // full-ish on phone
const BUBBLE_MAX_W  = isTablet ? 520 : SCREEN_W * 0.78;
const fs = (size: number) => {
  // scale font down slightly on SE, keep normal elsewhere
  if (isSmallPhone) return Math.round(size * 0.92);
  return size;
};

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderInline(text: string, baseStyle: object, key: string) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<Text key={`${key}-t${i++}`} style={baseStyle}>{text.slice(last, m.index)}</Text>);
    if (m[2])      parts.push(<Text key={`${key}-b${i++}`} style={[baseStyle, { fontWeight: '700' }]}>{m[2]}</Text>);
    else if (m[3]) parts.push(<Text key={`${key}-i${i++}`} style={[baseStyle, { fontStyle: 'italic' }]}>{m[3]}</Text>);
    else if (m[4]) parts.push(<Text key={`${key}-c${i++}`} style={[baseStyle, mdStyles.inlineCode]}>{m[4]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Text key={`${key}-t${i++}`} style={baseStyle}>{text.slice(last)}</Text>);
  return parts.length ? parts : [<Text key={key} style={baseStyle}>{text}</Text>];
}

function MarkdownMessage({ content, isUser }: { content: string; isUser: boolean }) {
  const textColor = isUser ? mdStyles.userText : mdStyles.aiText;
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;
  let listStart = 0;
  let pendingOlNumber: number | null = null;

  const flushList = () => {
    if (!listBuffer.length) return;
    nodes.push(
      <View key={`list-${nodes.length}`} style={mdStyles.list}>
        {listBuffer.map((item, idx) => (
          <View key={idx} style={mdStyles.listItem}>
            <Text style={[mdStyles.bullet, textColor]}>{listOrdered ? `${listStart + idx}.` : '•'}</Text>
            <Text style={[mdStyles.listText, textColor]}>
              {renderInline(item, [mdStyles.listText, textColor] as any, `li-${nodes.length}-${idx}`)}
            </Text>
          </View>
        ))}
      </View>
    );
    listBuffer = []; listOrdered = false; listStart = 0;
  };

  lines.forEach((line, idx) => {
    const olMatch      = line.match(/^(\d+)\.\s+(.*)/);
    const ulMatch      = line.match(/^[-*]\s+(.*)/);
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    const hrMatch      = line.match(/^---+$/);
    const bqMatch      = line.match(/^>\s+(.*)/);

    if (pendingOlNumber !== null && !olMatch) {
      const c = line.replace(/^\*\*(.+?)\*\*:?/, '$1');
      if (line.trim()) { listBuffer.push(c); pendingOlNumber = null; return; }
    }
    if (olMatch) {
      if (!listOrdered && listBuffer.length) flushList();
      if (!listBuffer.length) { listOrdered = true; listStart = parseInt(olMatch[1]); }
      if (olMatch[2].trim() === '') { pendingOlNumber = parseInt(olMatch[1]); return; }
      listBuffer.push(olMatch[2]); return;
    }
    if (ulMatch) {
      if (listOrdered && listBuffer.length) flushList();
      listBuffer.push(ulMatch[1]); return;
    }
    flushList();
    if (!line.trim()) { nodes.push(<View key={`sp-${idx}`} style={{ height: 6 }} />); return; }
    if (hrMatch)      { nodes.push(<View key={`hr-${idx}`} style={mdStyles.hr} />); return; }
    if (bqMatch) {
      nodes.push(
        <View key={`bq-${idx}`} style={mdStyles.blockquote}>
          <Text style={mdStyles.blockquoteText}>{renderInline(bqMatch[1], mdStyles.blockquoteText, `bq-${idx}`)}</Text>
        </View>
      ); return;
    }
    if (headingMatch) {
      const level = headingMatch[1].length;
      const hStyle = level === 1 ? mdStyles.h1 : level === 2 ? mdStyles.h2 : mdStyles.h3;
      nodes.push(<Text key={`h-${idx}`} style={[hStyle, textColor]}>{headingMatch[2]}</Text>); return;
    }
    nodes.push(<Text key={`p-${idx}`} style={[mdStyles.para, textColor]}>{renderInline(line, [mdStyles.para, textColor] as any, `p-${idx}`)}</Text>);
  });
  flushList();
  return <View>{nodes}</View>;
}

const mdStyles = StyleSheet.create({
  para:          { fontSize: fs(15), lineHeight: fs(15) * 1.5 },
  userText:      { color: '#fff' },
  aiText:        { color: colors.textPrimary },
  h1:            { fontSize: fs(18), fontWeight: '700', marginBottom: 4 },
  h2:            { fontSize: fs(16), fontWeight: '700', marginBottom: 4 },
  h3:            { fontSize: fs(15), fontWeight: '700', marginBottom: 4 },
  list:          { marginVertical: 4, gap: 4 },
  listItem:      { flexDirection: 'row', gap: 8 },
  bullet:        { fontSize: fs(15), lineHeight: fs(15) * 1.5, width: 18 },
  listText:      { fontSize: fs(15), lineHeight: fs(15) * 1.5, flex: 1 },
  blockquote:    { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 10, marginVertical: 4 },
  blockquoteText:{ fontSize: fs(14), color: colors.textSecondary, fontStyle: 'italic' },
  hr:            { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  inlineCode:    { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: fs(13), backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 4, borderRadius: 4 },
});

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loop = Animated.loop(Animated.stagger(160, anims.map(a =>
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    )));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 6, paddingHorizontal: 2 }}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.textTertiary, opacity: a }} />
      ))}
    </View>
  );
}

// ─── Sidebar with swipe-to-close ──────────────────────────────────────────────
function Sidebar({
  visible, conversations, activeConvId, onSelect, onNew, onClose,
}: {
  visible: boolean;
  conversations: any[];
  activeConvId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const insets    = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: visible ? 0 : -SIDEBAR_W,
        useNativeDriver: true, tension: 85, friction: 13,
      }),
      Animated.timing(fadeAnim, {
        toValue: visible ? 0.55 : 0, duration: 220, useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible]);

  // Swipe left to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          slideAnim.setValue(Math.max(-SIDEBAR_W, g.dx));
          fadeAnim.setValue(0.55 * (1 - Math.abs(g.dx) / SIDEBAR_W));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SIDEBAR_W * 0.3 || g.vx < -0.6) {
          onClose();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 85, friction: 13 }).start();
          Animated.timing(fadeAnim, { toValue: 0.55, duration: 150, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  function relTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dim backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Panel with swipe gesture */}
        <Animated.View {...panResponder.panHandlers} style={[
          sidebarStyles.panel,
          { transform: [{ translateX: slideAnim }], paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}>
          {/* Header */}
          <View style={sidebarStyles.header}>
            <View style={sidebarStyles.logo}>
              <LinearGradient colors={['#818cf8', '#a78bfa']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={sidebarStyles.logoText}>AI</Text>
            </View>
            <Text style={sidebarStyles.title}>AlemX Support</Text>
            <TouchableOpacity onPress={onClose} style={sidebarStyles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={sidebarStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* New chat */}
          <TouchableOpacity style={sidebarStyles.newBtn} onPress={() => { onClose(); setTimeout(onNew, 250); }} activeOpacity={0.8}>
            <Text style={sidebarStyles.newBtnPlus}>＋</Text>
            <Text style={sidebarStyles.newBtnText}>New conversation</Text>
          </TouchableOpacity>

          <View style={sidebarStyles.divider} />
          <Text style={sidebarStyles.sectionLabel}>RECENT</Text>

          <FlatList
            data={conversations}
            keyExtractor={c => c.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text style={sidebarStyles.emptyText}>No conversations yet{'\n'}Start a new one above</Text>
            }
            renderItem={({ item }) => {
              const isActive = item.id === activeConvId;
              return (
                <TouchableOpacity
                  style={[sidebarStyles.convItem, isActive && sidebarStyles.convItemActive]}
                  onPress={() => { onClose(); setTimeout(() => onSelect(item.id), 250); }}
                  activeOpacity={0.7}
                >
                  {isActive && <View style={sidebarStyles.activeBar} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[sidebarStyles.convTitle, isActive && sidebarStyles.convTitleActive]} numberOfLines={1}>
                      {item.first_message || 'New conversation'}
                    </Text>
                    <Text style={sidebarStyles.convMeta}>{relTime(item.updated_at)} · {item.message_count} msg</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  panel: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: '#111118',
    borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
  },
  header:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  logo:           { width: 34, height: 34, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoText:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  title:          { flex: 1, fontSize: fs(16), fontWeight: '700', color: colors.textPrimary },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText:   { fontSize: 13, color: colors.textSecondary },
  newBtn:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryDim, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 14, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)' },
  newBtnPlus:     { fontSize: 20, color: colors.primary, lineHeight: 22 },
  newBtnText:     { fontSize: fs(15), fontWeight: '600', color: colors.primary },
  divider:        { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: spacing.md },
  sectionLabel:   { fontSize: 10, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.2, marginBottom: spacing.sm, paddingHorizontal: 4 },
  emptyText:      { color: colors.textTertiary, fontSize: fs(13), textAlign: 'center', marginTop: spacing.xl, lineHeight: 20 },
  convItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: radius.md, marginBottom: 2, position: 'relative', minHeight: 48 },
  convItemActive: { backgroundColor: 'rgba(99,102,241,0.12)' },
  convTitle:      { fontSize: fs(14), color: colors.textSecondary, fontWeight: '500' },
  convTitleActive:{ color: colors.textPrimary, fontWeight: '600' },
  convMeta:       { fontSize: fs(11), color: colors.textTertiary, marginTop: 2 },
  activeBar:      { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: colors.primary },
});

// ─── Topics data ─────────────────────────────────────────────────────────────
type Topic = { icon: string; label: string; color: string; questions: string[] };

const TOPICS: Topic[] = [
  { icon: '👁️', label: 'Attention\nMarketplace', color: '#6366f1',
    questions: ['How does Proof-of-Attention work?', 'How do I set a price for messages?', 'How do I earn from content?', 'Why are my attention earnings missing?'] },
  { icon: '🌟', label: 'Founding\nCreator', color: '#a78bfa',
    questions: ['What are Founding Creator benefits?', 'Am I eligible to be a Founding Creator?', 'How do I apply for the badge?', 'I missed the Founding Creator window'] },
  { icon: '🪙', label: '$Alem\nToken', color: '#f59e0b',
    questions: ['What is $Alem used for?', 'How do I invest in $Alem?', 'When will $Alem be listed?', 'What is the vesting schedule?'] },
  { icon: '💳', label: 'Visa Card', color: '#10b981',
    questions: ['How do I activate my Visa card?', 'Why was my card declined?', 'What are the spending limits?', 'How do I get a virtual card?'] },
  { icon: '🔐', label: 'KYC\nVerification', color: '#ef4444',
    questions: ['Why was my KYC rejected?', 'What documents do I need?', 'How long does KYC take?', 'Can I reuse KYC across banks?'] },
  { icon: '📈', label: 'Trading &\nPayments', color: '#3b82f6',
    questions: ['How do I buy stocks or crypto?', 'Why did my trade fail?', 'Is trading in my region?', 'How do I pay with AlemX?'] },
  { icon: '👥', label: 'P2P\nTransfers', color: '#06b6d4',
    questions: ['How do I send money to a contact?', 'Can I send via QR code?', 'How do I set up recurring payments?', 'Why did my P2P transfer fail?'] },
  { icon: '🌍', label: 'Borderless\nPayments', color: '#8b5cf6',
    questions: ['How do I send international payments?', 'What are cross-border fees?', 'How long does a transfer take?', 'What currencies are supported?'] },
  { icon: '🏦', label: 'Partner\nBanks', color: '#f97316',
    questions: ['How do I open a bank account?', 'Which partner banks are available?', 'My onboarding is stuck on pending', 'Do I need KYC for each bank?'] },
  { icon: '💡', label: 'Revenue\nSharing', color: '#ec4899',
    questions: ['How does revenue sharing work?', 'How do I set my earnings split?', 'When are payouts processed?', 'My revenue share earnings are wrong'] },
  { icon: '🔗', label: 'DApp &\nWallet', color: '#14b8a6',
    questions: ['How do I connect my Web3 wallet?', 'Which wallets are supported?', 'How do I use a DeFi protocol?', 'My DApp connection is not working'] },
  { icon: '🗺️', label: 'City Events', color: '#84cc16',
    questions: ['What cities is AlemX visiting in 2026?', 'When is the AlemX Dubai event?', 'How do I attend a city event?', 'How do I host an event?'] },
];

// ─── Topic bottom sheet ───────────────────────────────────────────────────────
function TopicSheet({ topic, onClose, onSend }: { topic: Topic; onClose: () => void; onSend: (text: string) => void }) {
  const [input, setInput] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sheetStyles.kvWrap}>
        <View style={[sheetStyles.panel, { paddingBottom: insets.bottom + 8 }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.header}>
            <View style={[sheetStyles.topicIconWrap, { backgroundColor: topic.color + '22' }]}>
              <Text style={sheetStyles.topicIcon}>{topic.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.topicTitle}>{topic.label.replace('\n', ' ')}</Text>
              <Text style={sheetStyles.topicSub}>Select or type your question</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={sheetStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {topic.questions.map((q) => (
              <TouchableOpacity key={q} style={sheetStyles.qBtn} onPress={() => { onSend(q); onClose(); }} activeOpacity={0.7}>
                <Text style={sheetStyles.qArrow}>→</Text>
                <Text style={sheetStyles.qText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={sheetStyles.inputRow}>
            <TextInput
              style={sheetStyles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Or type your own question…"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="send"
              onSubmitEditing={() => { if (input.trim()) { onSend(input.trim()); onClose(); } }}
            />
            <TouchableOpacity
              style={[sheetStyles.sendBtn, { backgroundColor: topic.color }, !input.trim() && { opacity: 0.35 }]}
              disabled={!input.trim()}
              onPress={() => { if (input.trim()) { onSend(input.trim()); onClose(); } }}
            >
              <Text style={sheetStyles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  kvWrap:       { justifyContent: 'flex-end', flex: 1 },
  panel:        { backgroundColor: '#1a1a28', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  topicIconWrap:{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topicIcon:    { fontSize: 22 },
  topicTitle:   { fontSize: fs(16), fontWeight: '700', color: colors.textPrimary },
  topicSub:     { fontSize: fs(12), color: colors.textTertiary, marginTop: 2 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, color: colors.textSecondary },
  qBtn:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  qArrow:       { fontSize: 14, color: colors.textTertiary },
  qText:        { fontSize: fs(14), color: colors.textSecondary, flex: 1, lineHeight: fs(14) * 1.4 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  input:        { flex: 1, height: 46, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: radius.xl, paddingHorizontal: 16, fontSize: fs(15), color: colors.textPrimary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sendBtn:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendIcon:     { color: '#fff', fontSize: 20, fontWeight: '700' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ChatMainScreen({ userId }: { userId: string }) {
  const {
    conversations, activeConvId, setActiveConvId,
    messages, isTyping, isLoading, error,
    sendMessage, newConversation,
  } = useChat(userId);

  const [input, setInput]             = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const listRef   = useRef<FlatList>(null);
  const insets    = useSafeAreaInsets();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const handleSend = useCallback((text?: string) => {
    const t = (text ?? input).trim();
    if (!t || isLoading) return;
    setInput('');
    sendMessage(t);
  }, [input, isLoading, sendMessage]);

  const isEmpty = messages.length === 0 && !isTyping;
  const tabBarH = 60 + (insets.bottom || 0);

  const data: (Message | { id: string; type: 'typing' })[] = isTyping
    ? [...messages, { id: 'typing', type: 'typing' as const }]
    : messages;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setSidebarOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, { width: 16 }]} />
            <View style={styles.menuLine} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>AlemX Support</Text>
          </View>

          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => newConversation()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.newChatBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* ── Content + input ── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Messages / empty */}
          {isEmpty ? (
            <ScrollView
              contentContainerStyle={[styles.emptyState, { paddingBottom: tabBarH + 24 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Hero */}
              <View style={styles.emptyLogoWrap}>
                <LinearGradient colors={['#6366f1', '#a78bfa']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={styles.emptyLogoText}>AI</Text>
              </View>
              <Text style={styles.emptyTitle}>How can I help you?</Text>
              <Text style={styles.emptySubtitle}>Choose a topic or ask anything about AlemX</Text>

              {/* Topics grid */}
              <View style={styles.topicsGrid}>
                {TOPICS.map(topic => (
                  <TouchableOpacity
                    key={topic.label}
                    style={styles.topicCard}
                    onPress={() => setActiveTopic(topic)}
                    activeOpacity={0.75}
                  >
                    <LinearGradient
                      colors={[topic.color + '22', topic.color + '08']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    />
                    <View style={[styles.topicIconWrap, { backgroundColor: topic.color + '30' }]}>
                      <Text style={styles.topicIcon}>{topic.icon}</Text>
                    </View>
                    <Text style={styles.topicLabel}>{topic.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={listRef}
              data={data}
              keyExtractor={m => m.id}
              contentContainerStyle={[styles.messageList, { paddingBottom: tabBarH + 60 }]}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                if ('type' in item && item.type === 'typing') {
                  return (
                    <View style={[styles.bubbleRow, styles.bubbleRowAI]}>
                      <View style={styles.avatar}><Text style={styles.avatarText}>AI</Text></View>
                      <View style={[styles.bubble, styles.bubbleAI]}><TypingDots /></View>
                    </View>
                  );
                }
                const msg = item as Message;
                const isUser = msg.role === 'user';
                return (
                  <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
                    {!isUser && <View style={styles.avatar}><Text style={styles.avatarText}>AI</Text></View>}
                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI, { maxWidth: BUBBLE_MAX_W }]}>
                      <MarkdownMessage content={msg.content} isUser={isUser} />
                      <Text style={[styles.timestamp, isUser && { color: 'rgba(255,255,255,0.45)' }]}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.ai_provider ? `  ·  ${msg.ai_provider}${msg.latency_ms ? `  ${msg.latency_ms}ms` : ''}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Input bar */}
          <View style={[styles.inputWrap, { paddingBottom: tabBarH + 24 }]}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Message AlemX Support…"
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={4000}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={() => handleSend()}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={!input.trim() || isLoading}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sendIcon}>↑</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Topic sheet */}
      {activeTopic && (
        <TopicSheet
          topic={activeTopic}
          onClose={() => setActiveTopic(null)}
          onSend={(text) => { setActiveTopic(null); handleSend(text); }}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        visible={sidebarOpen}
        conversations={conversations}
        activeConvId={activeConvId}
        onSelect={(id) => setActiveConvId(id)}
        onNew={() => newConversation()}
        onClose={() => setSidebarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  menuBtn:        { width: 40, height: 40, justifyContent: 'center', gap: 5, paddingLeft: 2 },
  menuLine:       { height: 2, width: 22, backgroundColor: colors.textSecondary, borderRadius: 2 },
  headerCenter:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  headerTitle:    { fontSize: fs(16), fontWeight: '600', color: colors.textPrimary },
  newChatBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  newChatBtnText: { fontSize: 22, color: colors.textSecondary, lineHeight: 26 },

  // Messages
  messageList:    { padding: spacing.md },
  bubbleRow:      { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
  bubbleRowUser:  { justifyContent: 'flex-end' },
  bubbleRowAI:    { justifyContent: 'flex-start', gap: spacing.sm },
  avatar:         { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:     { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubble:         { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:     { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAI:       { backgroundColor: 'rgba(255,255,255,0.07)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  timestamp:      { fontSize: fs(11), color: colors.textTertiary, marginTop: 5 },

  // Empty state / topics
  emptyState:      { flexGrow: 1, alignItems: 'center', padding: spacing.lg, paddingTop: 36 },
  emptyLogoWrap:   { width: 68, height: 68, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyLogoText:   { color: '#fff', fontSize: 24, fontWeight: '700' },
  emptyTitle:      { fontSize: fs(22), fontWeight: '700', color: colors.textPrimary, marginBottom: 6, letterSpacing: -0.3, textAlign: 'center' },
  emptySubtitle:   { fontSize: fs(14), color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  topicsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%', justifyContent: 'space-between' },
  topicCard:       {
    width: isTablet ? '23%' : '48%',
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    minHeight: isSmallPhone ? 90 : 100,
    justifyContent: 'flex-end',
    gap: 8,
  },
  topicIconWrap:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  topicIcon:       { fontSize: fs(20) },
  topicLabel:      { fontSize: fs(13), fontWeight: '600', color: colors.textPrimary, lineHeight: fs(13) * 1.35 },

  // Input
  inputWrap:      { paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: colors.bgPrimary },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input:          { flex: 1, minHeight: 46, maxHeight: 130, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: fs(15), color: colors.textPrimary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sendBtn:        { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ opacity: 0.3 },
  sendIcon:       { color: '#fff', fontSize: 22, fontWeight: '700' },

  // Error
  errorBanner:    { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  errorText:      { fontSize: fs(13), color: colors.error, textAlign: 'center' },
});
