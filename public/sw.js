// remnd Service Worker
// Handles Web Push events and shows notifications even when the tab is closed.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title ?? "remnd";
  const options = {
    body: data.body ?? "Your reminder is here.",
    icon: data.icon ?? "/icon-192.png",
    badge: data.badge ?? "/badge-72.png",
    data: { path: data.path ?? "/" },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path ?? "/";
  const url = new URL(path, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if already open
        for (const client of clientList) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
