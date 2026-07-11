import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Push notifications for marketplace events (a bid arrives on your shipment; your
// bid was accepted). The device's native push token (FCM on Android, APNs on
// iOS) is stored on users/{uid}; the EC2 /notify endpoint sends the actual push
// via firebase-admin. Android works end-to-end today; iOS needs an APNs key
// registered in Firebase before delivery works (registration still no-ops safely).

const API = (process.env.EXPO_PUBLIC_SHIP_API_URL ?? 'http://16.16.79.251:8090').replace(/\/$/, '');

// Show banners while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Ask permission and return the native device push token (or null if declined /
// on a simulator / iOS APNs not yet provisioned).
export async function registerForPush(): Promise<{ token: string; platform: string } | null> {
  if (!Device.isDevice) return null; // push tokens aren't issued on simulators
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted || req.status === 'granted';
    }
    if (!granted) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const tok = await Notifications.getDevicePushTokenAsync();
    return { token: String(tok.data), platform: Platform.OS };
  } catch {
    return null; // e.g. iOS without an APNs entitlement yet
  }
}

// Fire a marketplace push via the EC2 relay. Best-effort — never throws into the
// caller's flow (a failed notification must not break bidding/accepting).
export async function notify(event: 'new_offer' | 'offer_accepted', shipmentId: string, extra?: Record<string, string>): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    await fetch(`${API}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ event, shipmentId, ...extra }),
    }).catch(() => {});
    clearTimeout(timer);
  } catch {
    /* ignore */
  }
}

// Register once per signed-in session and persist the token via saveProfile.
export function usePushRegistration(uid: string | null, currentToken: string | undefined, saveProfile: (p: any) => Promise<void>) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || done.current === uid) return;
    done.current = uid;
    registerForPush().then((res) => {
      if (res && res.token && res.token !== currentToken) {
        saveProfile({ pushToken: res.token, pushPlatform: res.platform }).catch(() => {});
      }
    });
  }, [uid]);
}
