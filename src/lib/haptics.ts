import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Medium) => {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style });
  }
};

export const hapticNotification = async (type: NotificationType = NotificationType.Success) => {
  if (Capacitor.isNativePlatform()) {
    await Haptics.notification({ type });
  }
};

export const hapticSelection = async () => {
  if (Capacitor.isNativePlatform()) {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
  }
};

export const hapticVibrate = async () => {
  if (Capacitor.isNativePlatform()) {
    await Haptics.vibrate();
  }
};
