import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, spacing } from '../theme';

const MAX_USERS = 5;

function Row({ label, value, onPress, right }: {
  label: string; value?: string; onPress?: () => void; right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : right}
    </TouchableOpacity>
  );
}

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
          const id  = await AsyncStorage.getItem(key) ?? '';
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
          await AsyncStorage.clear();
          Alert.alert('Done', 'Restart the app to complete reset.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Active user */}
        <Text style={styles.section}>Test Users</Text>
        <View style={styles.card}>
          {users.map(u => (
            <TouchableOpacity
              key={u.id}
              style={[styles.row, activeUserId === u.id && styles.rowActive]}
              onPress={() => setActiveUserId(u.id)}
            >
              <View style={[styles.userDot, activeUserId === u.id && styles.userDotActive]} />
              <Text style={styles.rowLabel}>{u.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{u.id.slice(-8)}</Text>
              {activeUserId === u.id && <Text style={styles.activeTag}>Active</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row label="App"     value="Pulse AI" />
          <Row label="Version" value="1.0.0" />
          <Row label="Backend" value="localhost:4000" />
        </View>

        {/* Danger zone */}
        <Text style={styles.section}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={clearData}>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Clear all local data</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bgSecondary },
  section:      { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  card:         { backgroundColor: colors.bgPrimary, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: colors.border },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderColor: colors.borderLight, gap: spacing.sm },
  rowActive:    { backgroundColor: colors.primaryDim },
  rowLabel:     { flex: 1, fontSize: 15, color: colors.textPrimary },
  rowValue:     { fontSize: 14, color: colors.textTertiary, maxWidth: 140, textAlign: 'right' },
  userDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  userDotActive:{ backgroundColor: colors.primary },
  activeTag:    { fontSize: 11, color: colors.primary, fontWeight: '600', backgroundColor: colors.primaryDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
});
