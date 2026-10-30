import { VAPID_PUBLIC_KEY } from '../config';
import type { Settings } from '../settings';
import { updateJson } from '../storage/github';

export interface Subscription {
  id: string;
  label: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  hour: number;
  timezone: string;
  lastSent: string | null;
}

export type PushStatus = 'unsupported' | 'needs-install' | 'missing-key' | 'denied' | 'off' | 'on';

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export async function getPushStatus(): Promise<PushStatus> {
  if (isIOS && !isStandalone) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) return 'missing-key';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Demande la permission, abonne l'appareil et l'enregistre dans subscriptions.json */
export async function enablePush(settings: Settings): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications refusées. Tu peux les réautoriser dans Réglages iOS › Notifications.');
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }));
  await syncSubscription(settings, sub);
}

/** Met à jour l'heure / le nom de l'appareil déjà abonné */
export async function syncSubscription(settings: Settings, sub?: PushSubscription | null): Promise<void> {
  sub ??= await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await updateJson<Subscription[]>(
    settings,
    'subscriptions.json',
    [],
    (list) => {
      const previous = list.find((s) => s.id === settings.deviceId || s.endpoint === sub.endpoint);
      const entry: Subscription = {
        id: settings.deviceId,
        label: settings.deviceLabel,
        endpoint: sub.endpoint,
        keys: json.keys as Subscription['keys'],
        hour: settings.hour,
        timezone,
        lastSent: previous?.lastSent ?? null,
      };
      return [...list.filter((s) => s !== previous), entry];
    },
    `Notifications : ${settings.deviceLabel}`,
  );
}

export async function disablePush(settings: Settings): Promise<void> {
  const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
  await sub?.unsubscribe();
  await updateJson<Subscription[]>(
    settings,
    'subscriptions.json',
    [],
    (list) => list.filter((s) => s.id !== settings.deviceId),
    `Notifications désactivées : ${settings.deviceLabel}`,
  );
}
