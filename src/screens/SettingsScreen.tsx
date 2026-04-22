import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../services/storage';
import { colors, radius, spacing } from '../theme';

function generateUserId() {
  return 'user-' + Math.random().toString(36).slice(2, 10);
}

const MAX_USERS = 5;

export function SettingsScreen({
  activeUserId,
  setActiveUserId,
}: {
  activeUserId: string;
  setActiveUserId: (id: string) => void;
}) {
  const [users, setUsers] = useState<{ label: string; id: string }[]>([]);

  useEffect(() => {
    (async () => {
      const loaded = await Promise.all(
        Array.from({ length: MAX_USERS }, async (_, i) => {
          const key = `user-slot-${i + 1}`;
          const id  = await storage.getItem(key) ?? '';
          return { label: `User ${i + 1}`, id };
        })
      );
      setUsers(loaded);
    })();
  }, []);

  const clearData = () => {
    Alert.alert('Clear all data', 'This will reset all local data and user IDs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await storage.clear();
          Alert.alert('Done', 'Restart the app to complete reset.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Manage test users and preferences</Text>
        </View>

        {/* Test Users */}
        <Text style={styles.section}>TEST USERS</Text>
        <View style={styles.card}>
          {users.map((u, i) => {
            const isActive = activeUserId === u.id;
            return (
              <TouchableOpacity
                key={u.id || i}
                style={[styles.row, i < users.length - 1 && styles.rowBorder]}
                onPress={async () => {
                  let id = u.id;
                  if (!id) {
                    id = generateUserId();
                    const key = `user-slot-${i + 1}`;
                    await storage.setItem(key, id);
                    setUsers(prev => prev.map((p, idx) => idx === i ? { ...p, id } : p));
                  }
                  setActiveUserId(id);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.userDot, isActive && styles.userDotActive]}>
                  {isActive && <View style={styles.userDotInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{u.label}</Text>
                  <Text style={styles.rowSub}>{u.id ? `···${u.id.slice(-8)}` : 'Tap to activate'}</Text>
                </View>
                {isActive && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>Active</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* About */}
        <Text style={styles.section}>ABOUT</Text>
        <View style={styles.card}>
          {[
            { label: 'App',     value: 'AlemX AI Support' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Platform', value: 'iOS · Android · Web' },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.row, i < arr.length - 1 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Danger */}
        <Text style={styles.section}>DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={clearData} activeOpacity={0.7}>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Clear all local data</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },
  headerSub:   { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  section: {
    fontSize: 11, fontWeight: '700', color: colors.textTertiary,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },

  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.glassBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },

  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, gap: spacing.md },
  rowBorder: { borderBottomWidth: 0.5, borderColor: colors.borderLight },
  rowLabel:  { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  rowSub:    { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  rowValue:  { fontSize: 14, color: colors.textTertiary },

  userDot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  userDotActive: { borderColor: colors.primary },
  userDotInner:  { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  activeTag: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)',
  },
  activeTagText: { fontSize: 11, fontWeight: '600', color: colors.primary },
});
