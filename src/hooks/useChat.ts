import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { Message, Conversation } from '../types';

export function useChat(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId,  setActiveConvId]  = useState<string | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [isTyping,      setIsTyping]      = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Reset when user changes
  useEffect(() => {
    setActiveConvId(null);
    setMessages([]);
  }, [userId]);

  const loadConversations = useCallback(async () => {
    try {
      const { conversations } = await api.getConversations(userId);
      setConversations(conversations);
    } catch (e) { console.error(e); }
  }, [userId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    api.getMessages(activeConvId, userId)
      .then(({ messages }) => setMessages(messages))
      .catch(console.error);
  }, [activeConvId, userId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);

    const tempId = 'temp-' + Date.now();
    const userMsg: Message = {
      id: tempId, role: 'user', content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const result = await api.sendMessage(userId, content, activeConvId ?? undefined);
      if (!activeConvId) {
        setActiveConvId(result.conversationId);
        await loadConversations();
      }
      const asstMsg: Message = {
        id: result.conversationId + '-' + Date.now(),
        role: 'assistant', content: result.content,
        created_at: new Date().toISOString(),
        ai_provider: result.provider,
        latency_ms: result.latency,
      };
      setMessages(prev => [...prev, asstMsg]);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  }, [isLoading, activeConvId, userId, loadConversations]);

  const newConversation = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
  }, []);

  return {
    conversations, activeConvId, setActiveConvId,
    messages, isTyping, isLoading, error,
    sendMessage, newConversation, loadConversations,
  };
}
