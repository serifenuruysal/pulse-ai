# Pulse AI — Mobile App

React Native mobile client for the Pulse AI support chatbot. Runs on iOS, Android, and Web via Expo.

Connects to the [ai-chatbot-support-insights backend](https://github.com/serifenuruysal/AI-Chat-Support-Insights) for real-time chat and analytics.

---

## Screens

| Screen | Description |
|--------|-------------|
| **Conversations** | List of past conversations with search |
| **Chat** | Real-time messaging with typing indicator and suggested prompts |
| **Analytics** | Charts and stats with Demo / Live toggle |
| **Settings** | Switch between 5 test user slots, clear local data |

---

## Quick Start

```bash
npm install
npx expo start
```

- Press `i` — iOS Simulator
- Press `a` — Android Emulator
- Press `w` — Browser
- Scan QR code — Physical device via Expo Go app

### Connect to backend

Edit `src/services/api.ts`:

```ts
// Simulator / web (default)
export const BASE_URL = 'http://localhost:4000';

// Physical device — use your Mac's local IP
// Find it: System Preferences → Network
export const BASE_URL = 'http://192.168.1.42:4000';

// Production
export const BASE_URL = 'https://your-app.up.railway.app';
```

---

## Demo vs Live Mode

The Analytics tab has a **Demo / Live** toggle.

| Mode | Data source |
|------|-------------|
| **Demo** | Built-in mock dataset — works without a backend |
| **Live** | Real data from the backend API |

Use Demo mode to explore the UI without a running backend. Switch to Live after running test conversations to see real sentiment, intent, and topic data.

---

## Test Users

The Settings tab has 5 user slots (User 1–5). Each slot gets a unique ID stored in AsyncStorage. Switching users changes the conversation history shown in the Chat tab — useful for testing multi-user scenarios.

---

## Deployment

### Web (Vercel / Netlify)

```bash
npx expo export --platform web
npx vercel dist/
```

### iOS + Android (App Stores via EAS Build)

```bash
npm install -g eas-cli
eas login
eas build:configure        # one-time setup, creates eas.json

# Build both platforms
eas build --platform all

# Submit to stores
eas submit --platform ios      # → TestFlight / App Store
eas submit --platform android  # → Google Play
```

### Internal testing (TestFlight preview)

```bash
eas build --platform ios --profile preview
eas submit --platform ios
```

---

## Project Structure

```
pulse-ai/
├── App.tsx                        # Root: bottom tab + stack navigator
├── app.json                       # Expo config
├── src/
│   ├── screens/
│   │   ├── ChatScreen.tsx         # Real-time chat UI
│   │   ├── ConversationsScreen.tsx# Conversation list with search
│   │   ├── AnalyticsScreen.tsx    # Charts, stats, Demo/Live toggle
│   │   └── SettingsScreen.tsx     # User switcher, app info
│   ├── hooks/
│   │   └── useChat.ts             # Chat + conversation state
│   ├── services/
│   │   └── api.ts                 # REST API client (BASE_URL config here)
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types
│   └── theme.ts                   # Colors, spacing, radius tokens
```

---

## Backend

This app requires the Pulse AI backend to be running for Live mode chat and analytics.

Backend repo: [ai-chatbot-support-insights](https://github.com/serifenuruysal/AI-Chat-Support-Insights)

```bash
# Run backend locally
cd ../ai-chatbot
./start.sh
```
