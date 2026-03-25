
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    console.warn("Push not supported in this browser");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;

  // Unsubscribe stale subscription first (idempotent)
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const keyUint8 = urlBase64ToUint8Array(vapidPublicKey);
  // Explicit ArrayBuffer copy satisfies strict TS5 lib typings for PushManager
  const applicationServerKey: ArrayBuffer = keyUint8.buffer.slice(
    keyUint8.byteOffset,
    keyUint8.byteOffset + keyUint8.byteLength
  ) as ArrayBuffer;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
