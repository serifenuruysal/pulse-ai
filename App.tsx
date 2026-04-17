import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { storage } from './src/services/storage';

import { ChatScreen }          from './src/screens/ChatScreen';
import { ConversationsScreen } from './src/screens/ConversationsScreen';
import { AnalyticsScreen }     from './src/screens/AnalyticsScreen';
import { SettingsScreen }      from './src/screens/SettingsScreen';
import { colors }              from './src/theme';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Tab icons ─────────────────────────────────────────────────────────────────
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Chat: '💬', Analytics: '📊', Settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? '•'}</Text>
  );
}

// ─── Chat stack (conversations → chat) ────────────────────────────────────────
function ChatStack({ userId }: { userId: string }) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Conversations"
        options={{
          title: 'Conversations',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.primary,
        }}
      >
        {({ navigation }) => (
          <ConversationsScreen
            userId={userId}
            onSelectConversation={(convId) =>
              navigation.navigate('Chat' as never, { convId } as never)
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Chat"
        options={{
          title: 'Support Chat',
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.primary,
        }}
      >
        {() => <ChatScreen userId={userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [userId, setUserId] = useState('');

  useEffect(() => {
    (async () => {
      let id = await storage.getItem('user-slot-1');
      if (!id) {
        id = 'demo-user-' + Math.random().toString(36).slice(2, 10);
        await storage.setItem('user-slot-1', id);
      }
      setUserId(id);
    })();
  }, []);

  if (!userId) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
            tabBarActiveTintColor:   colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              backgroundColor: colors.bgPrimary,
              borderTopColor:  colors.border,
              borderTopWidth:  0.5,
              paddingBottom:   4,
              height:          56,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          })}
        >
          <Tab.Screen name="Chat">
            {() => <ChatStack userId={userId} />}
          </Tab.Screen>

          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{ headerShown: false }}
          />

          <Tab.Screen name="Settings">
            {() => (
              <SettingsScreen
                activeUserId={userId}
                setActiveUserId={setUserId}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
