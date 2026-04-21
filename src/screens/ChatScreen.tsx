import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat } from '../hooks/useChat';
import { colors, radius, spacing } from '../theme';
import type { Message } from '../types';

// ─── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(text: string, baseStyle: object, key: string) {
  // Handle **bold** and *italic* inline
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<Text key={`${key}-t${i++}`} style={baseStyle}>{text.slice(last, m.index)}</Text>);
    if (m[2]) parts.push(<Text key={`${key}-b${i++}`} style={[baseStyle, { fontWeight: '700' }]}>{m[2]}</Text>);
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
  let pendingOlNumber: number | null = null; // handles "1.\n**content**" split across lines

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
    listBuffer = [];
    pendingOlNumber = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();

    // Blank line
    if (line.trim() === '') {
      flushList();
      return;
    }

    // Headings
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    if (h1 || h2 || h3) {
      flushList();
      const text = (h1 || h2 || h3)![1];
      const style = h1 ? mdStyles.h1 : h2 ? mdStyles.h2 : mdStyles.h3;
      nodes.push(<Text key={idx} style={[style, textColor]}>{text}</Text>);
      return;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      nodes.push(<View key={idx} style={mdStyles.hr} />);
      return;
    }

    // Unordered list
    const ul = line.match(/^[-*•]\s+(.+)/);
    if (ul) {
      if (listBuffer.length === 0) listOrdered = false;
      pendingOlNumber = null;
      listBuffer.push(ul[1]);
      return;
    }

    // Ordered list — "1. content" on same line
    const ol = line.match(/^(\d+)[.)]\s+(.+)/);
    if (ol) {
      if (listBuffer.length === 0) { listOrdered = true; listStart = parseInt(ol[1]); }
      pendingOlNumber = null;
      listBuffer.push(ol[2]);
      return;
    }

    // Ordered list — bare "1." with content on next line (OpenAI style)
    const olBare = line.match(/^(\d+)[.)]\s*$/);
    if (olBare) {
      if (listBuffer.length === 0) { listOrdered = true; listStart = parseInt(olBare[1]); }
      pendingOlNumber = parseInt(olBare[1]);
      return;
    }

    // Content line following a bare "1." marker
    if (pendingOlNumber !== null) {
      listBuffer.push(line.trim());
      pendingOlNumber = null;
      return;
    }

    flushList();

    // Blockquote
    const bq = line.match(/^>\s*(.*)/);
    if (bq) {
      nodes.push(
        <View key={idx} style={mdStyles.blockquote}>
          <Text style={[mdStyles.blockquoteText, textColor]}>{bq[1]}</Text>
        </View>
      );
      return;
    }

    // Normal paragraph
    nodes.push(
      <Text key={idx} style={[mdStyles.para, textColor]}>
        {renderInline(line, [mdStyles.para, textColor] as any, `p-${idx}`)}
      </Text>
    );
  });

  flushList();
  return <View style={mdStyles.root}>{nodes}</View>;
}

const mdStyles = StyleSheet.create({
  root:          { gap: 4 },
  userText:      { color: '#fff' },
  aiText:        { color: colors.textPrimary },
  para:          { fontSize: 15, lineHeight: 22 },
  h1:            { fontSize: 17, fontWeight: '700', lineHeight: 24, marginTop: 4, marginBottom: 2 },
  h2:            { fontSize: 16, fontWeight: '700', lineHeight: 22, marginTop: 4, marginBottom: 2 },
  h3:            { fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 2 },
  list:          { gap: 4, marginVertical: 2 },
  listItem:      { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  bullet:        { fontSize: 14, lineHeight: 22, minWidth: 16 },
  listText:      { flex: 1, fontSize: 15, lineHeight: 22 },
  blockquote:    { borderLeftWidth: 3, borderColor: colors.primary, paddingLeft: 10, opacity: 0.85 },
  blockquoteText:{ fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  inlineCode:    { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 4, borderRadius: 3 },
  hr:            { height: 1, backgroundColor: colors.border, marginVertical: 6 },
});

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={{ maxWidth: '80%' }}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <MarkdownMessage content={msg.content} isUser={isUser} />
        </View>
        <Text style={[styles.timestamp, { textAlign: isUser ? 'right' : 'left' }]}>
          {time}
          {msg.ai_provider ? `  ·  ${msg.ai_provider}${msg.latency_ms ? ` ${msg.latency_ms}ms` : ''}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowAI]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>AI</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAI, { paddingVertical: 14 }]}>
        <Text style={{ color: colors.textTertiary, fontSize: 18, letterSpacing: 4 }}>···</Text>
      </View>
    </View>
  );
}

// ─── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED = [
  { icon: '👁️', text: 'How does the Paid Attention Marketplace work?' },
  { icon: '🪙', text: 'Tell me about the $Alem token' },
  { icon: '🔐', text: 'How do I complete KYC verification?' },
  { icon: '💸', text: 'How do cross-border payments work on AlemX?' },
];

// ─── Screen ────────────────────────────────────────────────────────────────────
export function ChatScreen({ userId }: { userId: string }) {
  const {
    messages, isTyping, isLoading, error,
    sendMessage, newConversation,
  } = useChat(userId);

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  }, [input, isLoading, sendMessage]);

  const isEmpty = messages.length === 0 && !isTyping;

  const data: (Message | { id: string; type: 'typing' })[] = isTyping
    ? [...messages, { id: 'typing', type: 'typing' as const }]
    : messages;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.avatarText}>AI</Text>
          <View style={styles.headerOnlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Support Assistant</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? 'Typing…' : '● Online'}
          </Text>
        </View>
        <TouchableOpacity onPress={newConversation} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyAvatar}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>AI</Text>
          </View>
          <Text style={styles.emptyTitle}>How can I help you today?</Text>
          <Text style={styles.emptySubtitle}>Ask anything about your wallet, card, or the app.</Text>
          <View style={styles.suggestions}>
            {SUGGESTED.map(s => (
              <TouchableOpacity
                key={s.text}
                style={styles.suggBtn}
                onPress={() => sendMessage(s.text)}
              >
                <Text style={styles.suggIcon}>{s.icon}</Text>
                <Text style={styles.suggText}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            if ('type' in item && item.type === 'typing') return <TypingIndicator />;
            return <MessageBubble msg={item as Message} />;
          }}
        />
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message Support Assistant…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={4000}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendBtnIcon}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.bgPrimary },
  header:           { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 0.5, borderColor: colors.border, gap: spacing.sm },
  headerAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerOnlineDot:  { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, borderWidth: 1.5, borderColor: colors.bgPrimary },
  headerTitle:      { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  headerStatus:     { fontSize: 12, color: colors.success, marginTop: 1 },
  newBtn:           { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border },
  newBtnText:       { fontSize: 12, color: colors.primary, fontWeight: '500' },
  messageList:      { padding: spacing.md, paddingBottom: spacing.xl },
  bubbleRow:        { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
  bubbleRowUser:    { justifyContent: 'flex-end' },
  bubbleRowAI:      { justifyContent: 'flex-start', gap: spacing.sm },
  avatar:           { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:       { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubble:           { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:       { backgroundColor: colors.userBubble, borderBottomRightRadius: 4 },
  bubbleAI:         { backgroundColor: colors.aiBubble, borderBottomLeftRadius: 4 },
  timestamp:        { fontSize: 11, color: colors.textTertiary, marginTop: 3, paddingHorizontal: 4 },
  emptyState:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyAvatar:      { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle:       { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  emptySubtitle:    { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 },
  suggestions:      { width: '100%', gap: spacing.sm },
  suggBtn:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bgSecondary, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border },
  suggIcon:         { fontSize: 20 },
  suggText:         { fontSize: 14, color: colors.textSecondary, flex: 1 },
  errorBanner:      { margin: spacing.md, padding: spacing.sm, backgroundColor: '#fee2e2', borderRadius: radius.sm },
  errorText:        { fontSize: 13, color: '#991b1b', textAlign: 'center' },
  inputRow:         { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 0.5, borderColor: colors.border, gap: spacing.sm, backgroundColor: colors.bgPrimary },
  input:            { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: colors.bgSecondary, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, borderWidth: 0.5, borderColor: colors.border },
  sendBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:  { opacity: 0.4 },
  sendBtnIcon:      { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -1 },
});
