// Chalo Service Worker for Web Push and Offline Shell (PWA)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// IndexedDB helper to get session token
function getSessionToken() {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open('chalo_pwa', 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('auth');
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('auth', 'readonly');
        const store = tx.objectStore('auth');
        const req = store.get('token');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      };
      open.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Handle incoming Web Push
self.addEventListener('push', (event) => {
  let data = {
    title: 'Someone nearby is leaving now',
    body: 'Tap to see where they are going and share a ride.',
    tripId: '',
    placeId: '',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [150, 50, 150],
    data: {
      tripId: data.tripId,
      placeId: data.placeId,
      url: data.tripId ? `/?trip=${data.tripId}` : '/',
    },
    actions: [
      { action: 'open', title: 'See Ride' },
      { action: 'dismiss', title: 'Not now' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification actions and clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};

  if (event.action === 'dismiss') {
    // Noise control: "Not now" button explicitly calls POST /notifications/dismiss
    if (notifData.placeId) {
      event.waitUntil(
        getSessionToken().then((token) => {
          if (!token) return;
          const apiBase = self.location.origin.includes('localhost') || self.location.origin.includes('127.0.0.1')
            ? 'http://127.0.0.1:8787'
            : self.location.origin;
          return fetch(`${apiBase}/notifications/dismiss`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ placeId: notifData.placeId }),
          }).catch(() => {});
        })
      );
    }
    return;
  }

  // Action 'open' or standard tap: navigate to trip screen
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = notifData.url || '/';
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
