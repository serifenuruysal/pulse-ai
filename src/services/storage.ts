import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getOrCreateUserId(key: string): Promise<string> {
  const stored = await AsyncStorage.getItem(key);
  if (stored) return stored;
  const id = Math.random().toString(36).slice(2, 10);
  await AsyncStorage.setItem(key, id);
  return id;
}
