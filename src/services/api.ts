import type { AnalyticsOverview, Conversation, Message } from '../types';

const DEV_URL = 'http://192.168.0.198:4000';
const PROD_URL = 'https://ai-chat-support-insights-production.up.railway.app';
export const BASE_URL = __DEV__ ? DEV_URL : PROD_URL;

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  sendMessage: (userId: string, content: string, conversationId?: string, forceNew?: boolean) =>
    request<{ conversationId: string; content: string; provider: string; latency: number }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(conversationId && !forceNew ? { userId, content, conversationId } : { userId, content, forceNew: true }),
    }),

  getConversations: (userId: string) =>
    request<{ conversations: Conversation[] }>(`/chat/conversations?userId=${encodeURIComponent(userId)}`),

  getMessages: (conversationId: string, userId: string) =>
    request<{ messages: Message[] }>(`/chat/messages/${conversationId}?userId=${encodeURIComponent(userId)}`),

  getAnalytics: (days = 30) =>
    request<AnalyticsOverview>(`/analytics/overview?days=${days}`),
};

// ── WebSocket ──────────────────────────────────────────────────────────────────
export const WS_URL = BASE_URL.replace(/^http/, 'ws') + '/ws';
