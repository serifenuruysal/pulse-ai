import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat } from '../hooks/useChat';
import { colors, radius, spacing } from '../theme';
import type { Message } from '../types';

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
      <View style={{ maxWidth: '75%' }}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {msg.content}
          </Text>
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
  { icon: '👛', text: 'How do I set up my Solana wallet?' },
  { icon: '💳', text: 'My payment card was declined' },
  { icon: '💰', text: 'What is the Paid Attention Marketplace?' },
  { icon: '🔐', text: 'I lost access to my account' },
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
  container:       { flex: 1, backgroundColor: colors.bgPrimary },
  header:          { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 0.5, borderColor: colors.border, gap: spacing.sm },
  headerAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  headerStatus:    { fontSize: 12, color: colors.success, marginTop: 1 },
  newBtn:          { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border },
  newBtnText:      { fontSize: 12, color: colors.primary, fontWeight: '500' },
  messageList:     { padding: spacing.md, paddingBottom: spacing.xl },
  bubbleRow:       { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end' },
  bubbleRowUser:   { justifyContent: 'flex-end' },
  bubbleRowAI:     { justifyContent: 'flex-start', gap: spacing.sm },
  avatar:          { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:      { color: '#fff', fontSize: 10, fontWeight: '700' },
  bubble:          { borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:      { backgroundColor: colors.userBubble, borderBottomRightRadius: 4 },
  bubbleAI:        { backgroundColor: colors.aiBubble, borderBottomLeftRadius: 4 },
  bubbleText:      { fontSize: 15, lineHeight: 22 },
  bubbleTextUser:  { color: '#fff' },
  bubbleTextAI:    { color: colors.textPrimary },
  timestamp:       { fontSize: 11, color: colors.textTertiary, marginTop: 3, paddingHorizontal: 4 },
  emptyState:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyAvatar:     { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  emptyTitle:      { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  emptySubtitle:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 20 },
  suggestions:     { width: '100%', gap: spacing.sm },
  suggBtn:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bgSecondary, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border },
  suggIcon:        { fontSize: 20 },
  suggText:        { fontSize: 14, color: colors.textSecondary, flex: 1 },
  errorBanner:     { margin: spacing.md, padding: spacing.sm, backgroundColor: '#fee2e2', borderRadius: radius.sm },
  errorText:       { fontSize: 13, color: '#991b1b', textAlign: 'center' },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, borderTopWidth: 0.5, borderColor: colors.border, gap: spacing.sm, backgroundColor: colors.bgPrimary },
  input:           { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: colors.bgSecondary, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, borderWidth: 0.5, borderColor: colors.border },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnIcon:     { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -1 },
});
