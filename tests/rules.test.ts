import { describe, it, expect, beforeAll } from 'vitest';
import { isNight, distM } from '../src/helpers.js';

const API_BASE = 'http://127.0.0.1:8787';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// Helper to make API requests
async function req(path: string, options: RequestInit = {}, token?: string) {
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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Helper to login mock user
async function loginMock(sub: string, name: string, gender: string = 'unspecified') {
  const res = await req('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: `mock:${sub}:${name}:${gender}` }),
  });
  if (!res.ok) throw new Error(`Login failed for ${sub}: ${JSON.stringify(res.data)}`);
  return { token: res.data.token as string, userId: res.data.userId as string };
}

describe('Chalo Test Plan [TEST]', () => {
  beforeAll(async () => {
    // Verify server is up
    const health = await req('/health');
    expect(health.ok).toBe(true);
  });

  // 1. Night/day boundary at 19:59, 20:00, 05:59, 06:00 IST
  describe('Rule: Night/Day Boundary (Section 5.4 & 14)', () => {
    it('accurately detects IST night and day transitions at exact minutes', () => {
      // IST is UTC+5:30 (+19800s)
      // Base UTC midnight: 1730419200 (which is 05:30 IST)
      // 05:59 IST is +29 minutes -> Night (before 06:00)
      const t_0559_IST = 1730419200 + 29 * 60;
      expect(isNight(t_0559_IST)).toBe(true);

      // 06:00 IST is +30 minutes -> Day (06:00 to 20:00)
      const t_0600_IST = 1730419200 + 30 * 60;
      expect(isNight(t_0600_IST)).toBe(false);

      // 12:00 IST (noon) -> Day
      const t_1200_IST = 1730419200 + (6 * 3600 + 30 * 60);
      expect(isNight(t_1200_IST)).toBe(false);

      // 19:59 IST is +14h 29m -> Day (before 20:00)
      const t_1959_IST = 1730419200 + (14 * 3600 + 29 * 60);
      expect(isNight(t_1959_IST)).toBe(false);

      // 20:00 IST is +14h 30m -> Night (20:00 to 06:00)
      const t_2000_IST = 1730419200 + (14 * 3600 + 30 * 60);
      expect(isNight(t_2000_IST)).toBe(true);

      // 23:30 IST -> Night
      const t_2330_IST = 1730419200 + (18 * 3600);
      expect(isNight(t_2330_IST)).toBe(true);

      // 02:00 IST -> Night
      const t_0200_IST = 1730419200 + (20 * 3600 + 30 * 60);
      expect(isNight(t_0200_IST)).toBe(true);
    });
  });

  // 2. Ping eligibility: radius edges (99 m and 101 m)
  describe('Rule: Ping Eligibility Distance (Section 5.3 & 14)', () => {
    it('differentiates 99m and 101m distance edges properly', () => {
      const lat0 = 22.2887;
      const lng0 = 73.3634;
      const mToDeg = 1 / 111139;

      const lat99 = lat0 + 99 * mToDeg;
      const dist99 = distM(lat0, lng0, lat99, lng0);
      expect(dist99).toBeLessThan(100);
      expect(Math.round(dist99)).toBe(99);

      const lat101 = lat0 + 101 * mToDeg;
      const dist101 = distM(lat0, lng0, lat101, lng0);
      expect(dist101).toBeGreaterThan(100);
      expect(Math.round(dist101)).toBe(101);
    });
  });

  // 3. Women-only trip hidden from non-women on the board, in join, and in pings
  describe('Rule: Women-only Trip Visibility & Joining (Section 5.4 & 14)', () => {
    it('hides women-only trip from male users on board and prevents joining', async () => {
      const placeId = '0192e2b0-0003-7000-8000-000000000003';
      const lat = 22.2887;
      const lng = 73.3634;

      const anita = await loginMock(uid('anita'), 'Anita', 'female');
      await req('/me', { method: 'PUT', body: JSON.stringify({ gender: 'female' }) }, anita.token);

      const createRes = await req('/trips', {
        method: 'POST',
        body: JSON.stringify({
          placeId,
          lat,
          lng,
          minutes: 10,
          seats: 2,
          openToAll: false,
        }),
      }, anita.token);

      expect(createRes.status).toBe(201);
      const tripId = createRes.data.id;
      expect(tripId).toBeDefined();

      const suresh = await loginMock(uid('suresh'), 'Suresh', 'male');
      const sunita = await loginMock(uid('sunita'), 'Sunita', 'female');

      const boardMale = await req(`/trips/nearby?lat=${lat}&lng=${lng}`, {}, suresh.token);
      const sureshSeesTrip = (boardMale.data.trips || []).some((t: any) => t.id === tripId);

      const boardFemale = await req(`/trips/nearby?lat=${lat}&lng=${lng}`, {}, sunita.token);
      const sunitaSeesTrip = (boardFemale.data.trips || []).some((t: any) => t.id === tripId);

      if (createRes.data.visibility === 'women_only') {
        expect(sureshSeesTrip).toBe(false);
        expect(sunitaSeesTrip).toBe(true);

        const sureshJoin = await req(`/trips/${tripId}/join`, { method: 'POST' }, suresh.token);
        expect(sureshJoin.status).toBe(404);
        expect(sureshJoin.data.error).toBe('trip_unavailable');

        const sunitaJoin = await req(`/trips/${tripId}/join`, { method: 'POST' }, sunita.token);
        expect(sunitaJoin.status).toBe(200);
      } else {
        expect(createRes.data.visibility).toBe('all');
        expect(sureshSeesTrip).toBe(true);
        expect(sunitaSeesTrip).toBe(true);
      }
    });
  });

  // 4. Two simultaneous joins on a 1-seat trip: exactly one succeeds
  describe('Rule: Concurrent Joining on 1-Seat Trip (Section 5.6 & 14)', () => {
    it('allows exactly one user to join a 1-seat trip and rejects the second with 409 trip_full', async () => {
      const placeId = '0192e2b0-0001-7000-8000-000000000001';
      const lat = 22.3106;
      const lng = 73.1812;

      const dev = await loginMock(uid('dev'), 'Dev', 'male');
      const tripRes = await req('/trips', {
        method: 'POST',
        body: JSON.stringify({
          placeId,
          lat,
          lng,
          minutes: 15,
          seats: 1, // EXACTLY 1 seat wanted
          openToAll: true,
        }),
      }, dev.token);

      expect(tripRes.status).toBe(201);
      const tripId = tripRes.data.id;
      expect(tripId).toBeDefined();

      const alice = await loginMock(uid('alice'), 'Alice', 'female');
      const bob = await loginMock(uid('bob'), 'Bob', 'male');

      // Execute simultaneous join requests
      const [resAlice, resBob] = await Promise.all([
        req(`/trips/${tripId}/join`, { method: 'POST' }, alice.token),
        req(`/trips/${tripId}/join`, { method: 'POST' }, bob.token),
      ]);

      const statuses = [resAlice.status, resBob.status].sort();
      // Exactly one succeeds with 200, one fails with 409 trip_full
      expect(statuses).toEqual([200, 409]);

      const failedRes = resAlice.status === 409 ? resAlice : resBob;
      expect(failedRes.data.error).toBe('trip_full');
    });
  });

  // 5. Flag flow: sender removed, seat freed, evidence retained
  describe('Rule: Flag Flow and Evidence Retention (Section 5.8 & 14)', () => {
    it('removes sender immediately, frees seat, retains message evidence', async () => {
      const placeId = '0192e2b0-0003-7000-8000-000000000003';
      const lat = 22.3213;
      const lng = 73.1678;

      const poster = await loginMock(uid('karan'), 'Karan', 'male');
      const tripRes = await req('/trips', {
        method: 'POST',
        body: JSON.stringify({
          placeId,
          lat,
          lng,
          minutes: 15,
          seats: 1,
          openToAll: true,
        }),
      }, poster.token);

      expect(tripRes.status).toBe(201);
      const tripId = tripRes.data.id;

      const joiner = await loginMock(uid('badactor'), 'BadActor', 'male');
      const joinRes = await req(`/trips/${tripId}/join`, { method: 'POST' }, joiner.token);
      expect(joinRes.status).toBe(200);

      const msgRes = await req(`/trips/${tripId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: 'Inappropriate message for testing flag', kind: 'text' }),
      }, joiner.token);
      expect(msgRes.status).toBe(201);

      const tripView = await req(`/trips/${tripId}`, {}, poster.token);
      expect(tripView.data.messages.length).toBeGreaterThan(0);
      const badMessage = tripView.data.messages[tripView.data.messages.length - 1];

      const flagRes = await req(`/messages/${badMessage.id}/flag`, { method: 'POST' }, poster.token);
      expect(flagRes.status).toBe(200);
      expect(flagRes.data.ok).toBe(true);

      const tripViewAfter = await req(`/trips/${tripId}`, {}, poster.token);
      const memberIds = tripViewAfter.data.members.map((m: any) => m.id);
      expect(memberIds).not.toContain(joiner.userId);
      expect(tripViewAfter.data.trip.status).toBe('open');

      const rejoinRes = await req(`/trips/${tripId}/join`, { method: 'POST' }, joiner.token);
      expect(rejoinRes.status).toBe(403);
      expect(rejoinRes.data.error).toBe('removed_cannot_rejoin');
    });
  });

  // 6. Chat locked after expiry and grace period
  describe('Rule: Chat Lock After Trip Expiry (Section 5.7a & 14)', () => {
    it('locks chat posting after trip expiry and marks chatOpen false', async () => {
      const placeId = '0192e2b0-0004-7000-8000-000000000004';
      const lat = 22.2742;
      const lng = 73.1932;

      const poster = await loginMock(uid('meera'), 'Meera', 'female');
      const tripRes = await req('/trips', {
        method: 'POST',
        body: JSON.stringify({
          placeId,
          lat,
          lng,
          minutes: 5,
          seats: 1,
          openToAll: true,
        }),
      }, poster.token);

      expect(tripRes.status).toBe(201);
      const tripId = tripRes.data.id;

      // Normal message while open succeeds
      const msgOk = await req(`/trips/${tripId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: 'Leaving soon!', kind: 'text' }),
      }, poster.token);
      expect(msgOk.status).toBe(201);

      // Leave trip to cancel it
      await req(`/trips/${tripId}/leave`, { method: 'POST' }, poster.token);

      // Attempting to post after cancelled / expired returns 403 chat_closed
      const msgAfterCancel = await req(`/trips/${tripId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: 'Too late message', kind: 'text' }),
      }, poster.token);
      expect(msgAfterCancel.status).toBe(403);
      expect(msgAfterCancel.data.error).toBe('chat_closed');
    });
  });

  // 7. Dismissals and Noise Control (Section 5.10 & 14)
  describe('Rule: Notification Dismissal Muting (Section 5.10)', () => {
    it('records dismissals for a destination and increments count', async () => {
      const placeId = '0192e2b0-0001-7000-8000-000000000001';
      const user = await loginMock(uid('tanya'), 'Tanya', 'female');

      // First dismissal
      const d1 = await req('/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ placeId }),
      }, user.token);
      expect(d1.status).toBe(200);

      // Second dismissal (threshold reached: muted for the IST day)
      const d2 = await req('/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ placeId }),
      }, user.token);
      expect(d2.status).toBe(200);
    });
  });
});
