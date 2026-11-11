import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { ApiClient } from '@junta/api-client';
export async function syncPushDevice(api: ApiClient) {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || (await Notifications.getPermissionsAsync()).status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.request('/devices', 'POST', { token, platform: Platform.OS });
}
