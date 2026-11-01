// Chalo API Client & Token Management

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787';

// Save token in IndexedDB for Service Worker access
function syncTokenToIndexedDB(token: string | null) {
  try {
    const open = indexedDB.open('chalo_pwa', 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('auth');
    };
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('auth', 'readwrite');
      const store = tx.objectStore('auth');
      if (token) {
        store.put(token, 'token');
      } else {
        store.delete('token');
      }
    };
  } catch (e) {
    console.error('IndexedDB token sync error:', e);
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('chalo_session_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('chalo_session_token', token);
  syncTokenToIndexedDB(token);
}

export function clearStoredToken() {
  localStorage.removeItem('chalo_session_token');
  localStorage.removeItem('chalo_user');
  syncTokenToIndexedDB(null);
}

export function getStoredUser(): any | null {
  const u = localStorage.getItem('chalo_user');
  return u ? JSON.parse(u) : null;
}

export function setStoredUser(user: any) {
  localStorage.setItem('chalo_user', JSON.stringify(user));
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearStoredToken();
    window.dispatchEvent(new Event('chalo_unauthorized'));
    throw new Error('unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Public
  getHealth: () => request('/health'),
  getVapidPublicKey: () => request<{ publicKey: string }>('/vapid-public-key'),

  // Auth
  authGoogle: async (idToken: string) => {
    const data = await request<{ token: string; userId: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    setStoredToken(data.token);
    return data;
  },

  // User & Profile
  getMe: async () => {
    const data = await request<{ user: any }>('/me');
    setStoredUser(data.user);
    return data.user;
  },
  updateGender: (gender: 'female' | 'male' | 'other' | 'unspecified') =>
    request('/me', {
      method: 'PUT',
      body: JSON.stringify({ gender }),
    }),

  // Presence
  updatePresence: (lat: number, lng: number, minutes: number = 30) =>
    request('/me/presence', {
      method: 'PUT',
      body: JSON.stringify({ lat, lng, minutes }),
    }),

  // Places
  getPlaces: (q: string = '') =>
    request<{ places: any[] }>(`/places?q=${encodeURIComponent(q)}`),
  createPlace: (name: string, kind: string, lat: number, lng: number) =>
    request('/places', {
      method: 'POST',
      body: JSON.stringify({ name, kind, lat, lng }),
    }),
  getSavedPlaces: () =>
    request<{ places: any[] }>('/me/saved-places'),
  savePlace: (placeId: string) =>
    request(`/me/saved-places/${placeId}`, { method: 'PUT' }),
  deleteSavedPlace: (placeId: string) =>
    request(`/me/saved-places/${placeId}`, { method: 'DELETE' }),

  // Push & Notifications
  savePushSubscription: (sub: { endpoint: string; p256dh: string; auth: string }) =>
    request('/me/push-subscription', {
      method: 'POST',
      body: JSON.stringify(sub),
    }),
  dismissNotification: (placeId: string) =>
    request('/notifications/dismiss', {
      method: 'POST',
      body: JSON.stringify({ placeId }),
    }),

  // Blocks
  blockUser: (userId: string) =>
    request('/blocks', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Trips
  postTrip: (params: { placeId: string; lat: number; lng: number; minutes: number; seats: number; openToAll?: boolean }) =>
    request<{ id: string; visibility: string; leaveAt: number; expiresAt: number }>('/trips', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getNearbyTrips: (lat: number, lng: number) =>
    request<{ trips: any[] }>(`/trips/nearby?lat=${lat}&lng=${lng}`),
  joinTrip: (tripId: string) =>
    request(`/trips/${tripId}/join`, { method: 'POST' }),
  leaveTrip: (tripId: string) =>
    request(`/trips/${tripId}/leave`, { method: 'POST' }),
  getTrip: (tripId: string, after: number = 0) =>
    request<{ trip: any; members: any[]; messages: any[]; chatOpen: boolean }>(`/trips/${tripId}?after=${after}`),
  sendMessage: (tripId: string, body: string, kind: 'text' | 'quick' = 'text') =>
    request(`/trips/${tripId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, kind }),
    }),
  flagMessage: (messageId: string) =>
    request(`/messages/${messageId}/flag`, { method: 'POST' }),
};
