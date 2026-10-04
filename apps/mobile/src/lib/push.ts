import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "./api";

let registeredToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false })
});

/** Asks permission, fetches the Expo push token and registers it with the API. Returns the token or null. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Messages",
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
    return data;
  } catch {
    // Push is unavailable (simulator, Expo Go on Android, no projectId, offline). The app works without it.
    return null;
  }
}

export async function unregisterPush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try { await api.notifications.unregisterPush(token); } catch { /* already logged out / offline */ }
}

/** Route to open for a notification payload. */
export function routeForNotificationData(data: Record<string, unknown> | null | undefined): string | null {
  const id = data && typeof data.messageId === "string" ? data.messageId : null;
  return id ? `/message/${id}` : "/inbox";
}
