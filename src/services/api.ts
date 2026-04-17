import type { AnalyticsOverview, Conversation, Message } from '../types';

// ── Change this to your backend URL when testing on a real device ──────────────
// Local dev:   http://localhost:4000   (works on simulator / web)
// Real device: http://YOUR_MAC_IP:4000 (e.g. http://192.168.1.42:4000)
export const BASE_URL = 'https://ai-chat-support-insights-production.up.railway.app';

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
  sendMessage: (userId: string, content: string, conversationId?: string) =>
    request<{ conversationId: string; content: string; provider: string; latency: number }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(conversationId ? { userId, content, conversationId } : { userId, content }),
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
