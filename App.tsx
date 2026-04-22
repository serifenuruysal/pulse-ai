import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { storage } from './src/services/storage';

import { ChatMainScreen } from './src/screens/ChatMainScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { SettingsScreen }  from './src/screens/SettingsScreen';
import { colors, radius, spacing } from './src/theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG: Record<string, { icon: string; iconActive: string; label: string }> = {
  Chat:      { icon: '🗨',  iconActive: '💬', label: 'Chat' },
  Analytics: { icon: '📊',  iconActive: '📊', label: 'Insights' },
  Settings:  { icon: '⚙️', iconActive: '⚙️', label: 'Settings' },
};

// ─── Custom glass tab bar ──────────────────────────────────────────────────────
function GlassTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tabStyles.wrapper, { paddingBottom: insets.bottom || 12 }]}>
      {Platform.OS !== 'web'
        ? <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,15,24,0.96)' }]} />
      }
      <View style={tabStyles.border} />
      <View style={tabStyles.inner}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const config  = TAB_CONFIG[route.name] ?? { icon: '•', iconActive: '•', label: route.name };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <View key={route.key} style={tabStyles.tab}>
              {focused && <View style={tabStyles.activePill} />}
              <Text onPress={onPress} style={[tabStyles.icon, focused ? tabStyles.iconActive : tabStyles.iconInactive]}>
                {focused ? config.iconActive : config.icon}
              </Text>
              <Text onPress={onPress} style={[tabStyles.label, focused ? tabStyles.labelActive : tabStyles.labelInactive]}>
                {config.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper:      { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  border:       { position: 'absolute', top: 0, left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  inner:        { flexDirection: 'row', paddingTop: 8, paddingHorizontal: spacing.md },
  tab:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, position: 'relative' },
  activePill:   {
    position: 'absolute', top: -8, width: 40, height: 3, borderRadius: radius.full, backgroundColor: colors.primary,
    ...Platform.select({
      ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 },
      android: { elevation: 6 },
      web:     { boxShadow: '0 0 10px 3px #6366f1' } as any,
    }),
  },
  icon:         { fontSize: 24 },
  iconActive:   { opacity: 1 },
  iconInactive: { opacity: 0.55 },
  label:        { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  labelActive:  { color: colors.primary },
  labelInactive:{ color: '#6e6e8a' },
});

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
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium:  { fontFamily: 'System', fontWeight: '500' },
            bold:    { fontFamily: 'System', fontWeight: '700' },
            heavy:   { fontFamily: 'System', fontWeight: '800' },
          },
          colors: {
            primary:      colors.primary,
            background:   colors.bgPrimary,
            card:         colors.bgPrimary,
            text:         colors.textPrimary,
            border:       colors.border,
            notification: colors.primary,
          },
        }}
      >
        <Tab.Navigator
          tabBar={(props) => <GlassTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Chat">
            {() => <ChatMainScreen userId={userId} />}
          </Tab.Screen>
          <Tab.Screen name="Analytics" component={AnalyticsScreen} />
          <Tab.Screen name="Settings">
            {() => <SettingsScreen activeUserId={userId} setActiveUserId={setUserId} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
