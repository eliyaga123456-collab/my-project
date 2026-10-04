import * as Haptics from "expo-haptics";

const safe = (run: () => Promise<void>) => { try { run().catch(() => undefined); } catch { /* haptics unavailable */ } };
export const haptic = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  select: () => safe(() => Haptics.selectionAsync())
};
