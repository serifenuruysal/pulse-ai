import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  return AsyncStorage.setItem(key, value);
}

async function clear(): Promise<void> {
  if (Platform.OS === 'web') { localStorage.clear(); return; }
  return AsyncStorage.clear();
}

export async function getOrCreateUserId(slot: string): Promise<string> {
  const stored = await getItem(slot);
  if (stored) return stored;
  const id = 'demo-user-' + Math.random().toString(36).slice(2, 10);
  await setItem(slot, id);
  return id;
}

export const storage = { getItem, setItem, clear };
