import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { translate } from "../i18n/core";
import { api } from "./api";

const PUSH_KEY = "unsaid.push";

let registeredToken: string | null = null;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false })
  });
} catch { /* notifications unavailable on this device build: the app works without them */ }

/** Asks permission, fetches the Expo push token and registers it with the API. Returns the token or null. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: translate("settings.notifications.channel"),
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#ff7440"
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.notifications.registerPush(data, Platform.OS === "ios" ? "ios" : "android");
    registeredToken = data;
    try { await SecureStore.setItemAsync(PUSH_KEY, data); } catch { /* keystore unavailable */ }
    return data;
  } catch {
    // Push is unavailable (simulator, Expo Go on Android, no projectId, offline). The app works without it.
    return null;
  }
}

export async function unregisterPush(): Promise<void> {
  let token = registeredToken;
  registeredToken = null;
  // After an app restart the in-memory copy is gone; fall back to the persisted one so logout still detaches this device.
  if (!token) { try { token = await SecureStore.getItemAsync(PUSH_KEY); } catch { token = null; } }
  try { await SecureStore.deleteItemAsync(PUSH_KEY); } catch { /* ignore */ }
  if (!token) return;
  try { await api.notifications.unregisterPush(token); } catch { /* already logged out / offline */ }
}

/** Route to open for a notification payload. */
export function routeForNotificationData(data: Record<string, unknown> | null | undefined): string | null {
  const id = data && typeof data.messageId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(data.messageId) ? data.messageId : null;
  return id ? `/message/${id}` : "/inbox";
}
