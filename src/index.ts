import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { buildPushPayload, type PushMessage, type PushSubscription, type VapidKeys } from '@block65/webcrypto-web-push';
import { TUNABLES } from './config.js';
import {
  now,
  dayNo,
  isNight,
  uuidv7,
  distM,
  box,
  validLoc,
} from './helpers.js';

type Env = {
  DB: D1Database;
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  PING_RADIUS_M?: string;  // default 100
  BOARD_RADIUS_M?: string; // default 1000
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  DEV_AUTH?: string; // allow mock authentication in dev/test
  ADMIN_SECRET?: string;
};

type User = {
  id: string;
  first_name: string;
  gender: 'female' | 'male' | 'other' | 'unspecified';
  status: 'active' | 'banned';
};

type AppEnv = { Bindings: Env; Variables: { user: User } };
type C = Context<AppEnv>;

const app = new Hono<AppEnv>();
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

// ---------- Metrics & State ----------
const startTime = Date.now();
const metrics = {
  requests: 0,
  errors: 0,
  statusCodes: {} as Record<number, number>,
};

const fail = (c: C, error: string, status: 400 | 401 | 403 | 404 | 409 | 429 = 400) =>
  c.json({ error }, status);

const log = (event: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ event, ts: Date.now(), ...data }));

// ---------- CORS Middleware (Step 11.7) ----------
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
    if (origin.endsWith('.pages.dev')) return origin;
    return origin;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// ---------- Structured Logging & Error Metric Middleware (Step 11.8) ----------
app.use('*', async (c, next) => {
  const start = Date.now();
  metrics.requests++;
  await next();
  const duration = Date.now() - start;
  const status = c.res.status;
  metrics.statusCodes[status] = (metrics.statusCodes[status] ?? 0) + 1;
  if (status >= 400) {
    metrics.errors++;
  }
  const u = c.get('user' as any);
  log('http.request', {
    method: c.req.method,
    path: c.req.path,
    status,
    durationMs: duration,
    userId: u?.id,
  });
});

// ---------- Public Endpoints (Step 11.5) ----------
app.get('/health', (c) => {
  return c.json({
    ok: true,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    metrics: {
      requests: metrics.requests,
      errors: metrics.errors,
      statusCodes: metrics.statusCodes,
    },
  });
});

app.get('/vapid-public-key', (c) => {
  return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY ?? '' });
});

// ---------- Auth Routes ----------
app.post('/auth/google', async (c) => {
  const { idToken } = await c.req.json().catch(() => ({}));
  if (typeof idToken !== 'string') return fail(c, 'bad_token');

  let sub = '';
  let first = 'Rider';
  let devGender: 'female' | 'male' | 'other' | 'unspecified' = 'unspecified';

  // Support Mock / Dev authentication for automated tests and development
  const isDevAuth = c.env.DEV_AUTH === 'true' || !c.env.GOOGLE_CLIENT_ID || c.env.GOOGLE_CLIENT_ID.startsWith('REPLACE_');
  if (isDevAuth && idToken.startsWith('mock:')) {
    // format mock:sub[:firstName[:gender]]
    const parts = idToken.split(':');
    sub = parts[1] || 'mock-user-1';
    first = parts[2] || 'Rider';
    if (parts[3] && ['female', 'male', 'other', 'unspecified'].includes(parts[3])) {
      devGender = parts[3] as any;
    }
  } else {
    try {
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: c.env.GOOGLE_CLIENT_ID,
      });
      sub = String(payload.sub);
      first = String(payload.given_name ?? payload.name ?? 'Rider').slice(0, 40);
    } catch {
      return fail(c, 'bad_token', 401);
    }
  }

  const userId = uuidv7();
  await c.env.DB.prepare(
    `INSERT INTO users (id, google_sub, first_name, gender, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(google_sub) DO UPDATE SET first_name = excluded.first_name`,
  ).bind(userId, sub, first, devGender, now()).run();

  const u = await c.env.DB.prepare(`SELECT id, status FROM users WHERE google_sub = ?1`).bind(sub).first<{ id: string; status: string }>();
  if (!u || u.status !== 'active') return fail(c, 'banned', 403);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(u.id)
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(c.env.SESSION_SECRET ?? 'chalo-dev-session-secret-min-32-chars-long!'));

  return c.json({ token, userId: u.id });
});

// ---------- Auth Middleware ----------
app.use('/*', async (c, next) => {
  // Public routes already handled or bypassed
  if (c.req.path === '/health' || c.req.path === '/auth/google' || c.req.path === '/vapid-public-key') {
    return next();
  }
  const h = c.req.header('Authorization') ?? '';
  if (!h.startsWith('Bearer ')) return fail(c, 'unauthorized', 401);
  try {
    const { payload } = await jwtVerify(
      h.slice(7),
      new TextEncoder().encode(c.env.SESSION_SECRET ?? 'chalo-dev-session-secret-min-32-chars-long!')
    );
    const u = await c.env.DB.prepare(`SELECT id, first_name, gender, status FROM users WHERE id = ?1 AND status = 'active'`)
      .bind(payload.sub).first<User>();
    if (!u) return fail(c, 'unauthorized', 401);
    c.set('user', u);
  } catch {
    return fail(c, 'unauthorized', 401);
  }
  return next();
});

// ---------- Profile, Presence, Places ----------
app.get('/me', async (c) => {
  const u = c.get('user');
  const user = await c.env.DB.prepare(`SELECT id, first_name, gender, status, created_at FROM users WHERE id = ?1`)
    .bind(u.id).first();
  return c.json({ user });
});

app.put('/me', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!['female', 'male', 'other', 'unspecified'].includes(b.gender)) return fail(c, 'bad_gender');
  await c.env.DB.prepare(`UPDATE users SET gender = ?1 WHERE id = ?2`).bind(b.gender, c.get('user').id).run();
  return c.json({ ok: true });
});

app.put('/me/presence', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!validLoc(b.lat, b.lng) || !TUNABLES.PRESENCE_OPTIONS_MINUTES.includes(b.minutes)) {
    return fail(c, 'bad_input');
  }
  const t = now();
  await c.env.DB.prepare(
    `INSERT INTO presence (user_id, lat, lng, updated_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(user_id) DO UPDATE SET lat = ?2, lng = ?3, updated_at = ?4, expires_at = ?5`,
  ).bind(c.get('user').id, b.lat, b.lng, t, t + b.minutes * 60).run();
  return c.json({ ok: true });
});

app.get('/places', async (c) => {
  const q = (c.req.query('q') ?? '').trim().slice(0, 40);
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, kind, lat, lng FROM places WHERE name LIKE ?1 ORDER BY name LIMIT 20`,
  ).bind(`%${q}%`).all();
  return c.json({ places: results });
});

app.post('/places', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.name !== 'string' || !validLoc(b.lat, b.lng) ||
      !['society', 'office', 'mall', 'other'].includes(b.kind)) return fail(c, 'bad_input');
  const id = uuidv7();
  await c.env.DB.prepare(
    `INSERT INTO places (id, name, kind, lat, lng, created_by, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(kind, name) DO NOTHING`,
  ).bind(id, b.name.trim(), b.kind, b.lat, b.lng, c.get('user').id, now()).run();
  const p = await c.env.DB.prepare(`SELECT id, name, kind, lat, lng FROM places WHERE kind = ?1 AND name = ?2`).bind(b.kind, b.name.trim()).first();
  return c.json(p, 201);
});

app.get('/me/saved-places', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.id, p.name, p.kind, p.lat, p.lng FROM saved_places s JOIN places p ON p.id = s.place_id WHERE s.user_id = ?1`,
  ).bind(c.get('user').id).all();
  return c.json({ places: results });
});

app.put('/me/saved-places/:placeId', async (c) => {
  try {
    await c.env.DB.prepare(`INSERT OR IGNORE INTO saved_places (user_id, place_id) VALUES (?1, ?2)`)
      .bind(c.get('user').id, c.req.param('placeId')).run();
  } catch { return fail(c, 'no_such_place', 404); }
  return c.json({ ok: true });
});

app.delete('/me/saved-places/:placeId', async (c) => {
  await c.env.DB.prepare(`DELETE FROM saved_places WHERE user_id = ?1 AND place_id = ?2`)
    .bind(c.get('user').id, c.req.param('placeId')).run();
  return c.json({ ok: true });
});

app.post('/me/push-subscription', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.endpoint !== 'string' || typeof b.p256dh !== 'string' || typeof b.auth !== 'string') return fail(c, 'bad_input');
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = ?2, p256dh = ?4, auth = ?5`,
  ).bind(uuidv7(), c.get('user').id, b.endpoint, b.p256dh, b.auth, now()).run();
  return c.json({ ok: true });
});

app.post('/notifications/dismiss', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.placeId !== 'string') return fail(c, 'bad_input');
  await c.env.DB.prepare(
    `INSERT INTO dismissals (user_id, place_id, day, count) VALUES (?1, ?2, ?3, 1)
     ON CONFLICT(user_id, place_id, day) DO UPDATE SET count = count + 1`,
  ).bind(c.get('user').id, b.placeId, dayNo()).run();
  return c.json({ ok: true });
});

app.post('/blocks', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.userId !== 'string' || b.userId === c.get('user').id) return fail(c, 'bad_input');
  try {
    await c.env.DB.prepare(`INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?1, ?2, ?3)`)
      .bind(c.get('user').id, b.userId, now()).run();
  } catch { return fail(c, 'no_such_user', 404); }
  return c.json({ ok: true });
});

// ---------- Trips ----------
app.post('/trips', async (c) => {
  const u = c.get('user');
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.placeId !== 'string' || !validLoc(b.lat, b.lng) ||
      !TUNABLES.LEAVE_OPTIONS_MINUTES.includes(b.minutes) ||
      !TUNABLES.SEATS_OPTIONS.includes(b.seats)) {
    return fail(c, 'bad_input');
  }

  const t = now();

  // Rate Limiting on posting trips (Step 11.4)
  const recentPost = await c.env.DB.prepare(
    `SELECT created_at FROM trips WHERE poster_id = ?1 ORDER BY created_at DESC LIMIT 1`
  ).bind(u.id).first<{ created_at: number }>();
  if (recentPost && (t - recentPost.created_at) < TUNABLES.POST_RATE_LIMIT_SECONDS) {
    return fail(c, 'rate_limited', 429);
  }

  // Check if user is currently active member of another live trip (Step 11.6)
  const userInLiveTrip = await c.env.DB.prepare(
    `SELECT t.id FROM trip_members m
       JOIN trips t ON t.id = m.trip_id
      WHERE m.user_id = ?1 AND m.status = 'joined'
        AND t.status IN ('open', 'full') AND t.expires_at > ?2 LIMIT 1`
  ).bind(u.id, t).first();
  if (userInLiveTrip) {
    return fail(c, 'already_have_live_trip', 409);
  }

  // Night rule (Section 5.4): a woman's night trip is women-only unless she opens it to everyone.
  const visibility = isNight(t) && u.gender === 'female' && b.openToAll !== true ? 'women_only' : 'all';
  const id = uuidv7();
  const leaveAt = t + b.minutes * 60;
  const expiresAt = leaveAt + TUNABLES.NO_SHOW_WAIT_MINUTES * 60;

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO trips (id, poster_id, place_id, origin_lat, origin_lng, seats_wanted, leave_at, expires_at, visibility, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      ).bind(id, u.id, b.placeId, b.lat, b.lng, b.seats, leaveAt, expiresAt, visibility, t),
      c.env.DB.prepare(`INSERT INTO trip_members (trip_id, user_id, role, status, joined_at) VALUES (?1, ?2, 'poster', 'joined', ?3)`)
        .bind(id, u.id, t),
    ]);
  } catch (e) {
    const m = String(e);
    if (m.includes('uq_trips_one_live_per_poster') || m.includes('UNIQUE')) return fail(c, 'already_have_live_trip', 409);
    if (m.includes('FOREIGN KEY')) return fail(c, 'no_such_place', 404);
    throw e;
  }

  const pingPromise = pingNearby(c.env, { id, placeId: b.placeId, lat: b.lat, lng: b.lng, visibility, posterId: u.id });
  if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
    c.executionCtx.waitUntil(pingPromise);
  } else {
    // For test environments where executionCtx might be absent
    pingPromise.catch((err) => log('ping.error', { error: String(err) }));
  }

  return c.json({ id, visibility, leaveAt, expiresAt }, 201);
});

// GET /trips/nearby: Live list of open trips within BOARD_RADIUS_M
app.get('/trips/nearby', async (c) => {
  const u = c.get('user');
  const lat = Number(c.req.query('lat')), lng = Number(c.req.query('lng'));
  if (!validLoc(lat, lng)) return fail(c, 'bad_location');

  const r = Number(c.env.BOARD_RADIUS_M ?? TUNABLES.DEFAULT_BOARD_RADIUS_M);
  const { dLat, dLng } = box(lat, r);
  const t = now();

  // Explicit, portable parameter binding
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.origin_lat, t.origin_lng, t.seats_wanted, t.leave_at, t.expires_at,
            pl.name AS place, pl.kind, pu.first_name AS poster,
            (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.role = 'joiner' AND m.status = 'joined') AS joined
       FROM trips t
       JOIN places pl ON pl.id = t.place_id
       JOIN users  pu ON pu.id = t.poster_id
      WHERE t.status = 'open' AND t.expires_at > ?1
        AND t.origin_lat BETWEEN ?2 AND ?3 AND t.origin_lng BETWEEN ?4 AND ?5
        AND (t.visibility = 'all' OR ?6 = 'female')
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = ?7 AND b.blocked_id = t.poster_id)
              OR (b.blocker_id = t.poster_id AND b.blocked_id = ?8)
        )
      LIMIT 100`,
  ).bind(t, lat - dLat, lat + dLat, lng - dLng, lng + dLng, u.gender, u.id, u.id).all<any>();

  const trips = results
    .map((tr) => ({ tr, d: distM(lat, lng, tr.origin_lat, tr.origin_lng) }))
    .filter(({ d }) => d <= r)
    .map(({ tr, d }) => ({
      id: tr.id,
      place: tr.place,
      kind: tr.kind,
      poster: tr.poster,
      going: tr.joined + 1,
      seatsLeft: tr.seats_wanted - tr.joined,
      leaveAt: tr.leave_at,
      expiresAt: tr.expires_at,
      distanceM: Math.round(d / TUNABLES.DISTANCE_BUCKET_METERS) * TUNABLES.DISTANCE_BUCKET_METERS,
    }));

  return c.json({ trips });
});

// POST /trips/:id/join
app.post('/trips/:id/join', async (c) => {
  const u = c.get('user');
  const tripId = c.req.param('id');
  const t = now();

  // 1. Check if user is already an active or removed member of this trip
  const existingMember = await c.env.DB.prepare(
    `SELECT role, status FROM trip_members WHERE trip_id = ?1 AND user_id = ?2`
  ).bind(tripId, u.id).first<{ role: string; status: string }>();

  if (existingMember) {
    if (existingMember.status === 'joined') {
      return c.json({ ok: true, already_joined: true });
    }
    if (existingMember.status === 'removed') {
      return fail(c, 'removed_cannot_rejoin', 403);
    }
  }

  // 2. Check if user is already active in another live trip
  const activeOtherTrip = await c.env.DB.prepare(
    `SELECT t.id FROM trip_members m
       JOIN trips t ON t.id = m.trip_id
      WHERE m.user_id = ?1 AND m.status = 'joined'
        AND t.status IN ('open', 'full') AND t.expires_at > ?2
        AND t.id != ?3 LIMIT 1`
  ).bind(u.id, t, tripId).first();

  if (activeOtherTrip) {
    return fail(c, 'already_in_live_trip', 409);
  }

  // 3. Verify trip availability and visibility
  const trip = await c.env.DB.prepare(
    `SELECT t.id, t.status, t.seats_wanted,
            (SELECT COUNT(*) FROM trip_members WHERE trip_id = t.id AND role = 'joiner' AND status = 'joined') AS joined_count
       FROM trips t
      WHERE t.id = ?1 AND t.expires_at > ?2
        AND (t.visibility = 'all' OR ?3 = 'female')
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = ?4 AND b.blocked_id = t.poster_id)
              OR (b.blocker_id = t.poster_id AND b.blocked_id = ?5)
        )`
  ).bind(tripId, t, u.gender, u.id, u.id).first<{ id: string; status: string; seats_wanted: number; joined_count: number }>();

  if (!trip) return fail(c, 'trip_unavailable', 404);
  if (trip.status !== 'open' || trip.joined_count >= trip.seats_wanted) {
    return fail(c, 'trip_full', 409);
  }

  // 4. Atomic join / rejoin with trigger capacity check
  try {
    const res = await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO trip_members (trip_id, user_id, role, status, joined_at) VALUES (?1, ?2, 'joiner', 'joined', ?3)
         ON CONFLICT(trip_id, user_id) DO UPDATE SET status = 'joined', joined_at = ?3 WHERE status = 'left'`,
      ).bind(tripId, u.id, t),
      c.env.DB.prepare(
        `UPDATE trips SET status = 'full' WHERE id = ?1 AND status = 'open'
           AND (SELECT COUNT(*) FROM trip_members WHERE trip_id = ?1 AND role = 'joiner' AND status = 'joined') >= seats_wanted`,
      ).bind(tripId),
    ]);
    if (res[0].meta.changes === 0) return fail(c, 'cannot_join', 403);
  } catch (e) {
    if (String(e).includes('trip_full')) return fail(c, 'trip_full', 409);
    throw e;
  }

  return c.json({ ok: true });
});

app.post('/trips/:id/leave', async (c) => {
  const u = c.get('user');
  const tripId = c.req.param('id');
  const m = await c.env.DB.prepare(`SELECT role FROM trip_members WHERE trip_id = ?1 AND user_id = ?2 AND status = 'joined'`)
    .bind(tripId, u.id).first<{ role: string }>();
  if (!m) return fail(c, 'not_a_member', 404);

  if (m.role === 'poster') {
    await c.env.DB.prepare(`UPDATE trips SET status = 'cancelled' WHERE id = ?1 AND status IN ('open','full')`).bind(tripId).run();
  } else {
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE trip_members SET status = 'left' WHERE trip_id = ?1 AND user_id = ?2`).bind(tripId, u.id),
      c.env.DB.prepare(`UPDATE trips SET status = 'open' WHERE id = ?1 AND status = 'full'`).bind(tripId),
    ]);
  }
  return c.json({ ok: true });
});

// GET /trips/:id: Members only trip screen
app.get('/trips/:id', async (c) => {
  const u = c.get('user');
  const tripId = c.req.param('id');
  const t = now();
  const after = Number(c.req.query('after') ?? 0);

  const trip = await c.env.DB.prepare(
    `SELECT t.id, t.status, t.leave_at, t.expires_at, t.seats_wanted, t.origin_lat, t.origin_lng,
            pl.name AS place, pl.kind
       FROM trips t JOIN places pl ON pl.id = t.place_id
       JOIN trip_members m ON m.trip_id = t.id AND m.user_id = ?2 AND m.status = 'joined'
      WHERE t.id = ?1`,
  ).bind(tripId, u.id).first<any>();
  if (!trip) return fail(c, 'not_a_member', 404);

  const members = await c.env.DB.prepare(
    `SELECT u.id, u.first_name, m.role FROM trip_members m JOIN users u ON u.id = m.user_id
      WHERE m.trip_id = ?1 AND m.status = 'joined'`,
  ).bind(tripId).all();

  const chatVisible = t < trip.expires_at + TUNABLES.CHAT_GRACE_AFTER_EXPIRY_SECONDS;
  const messages = chatVisible
    ? (await c.env.DB.prepare(
        `SELECT g.id, g.user_id, u.first_name, g.kind, g.body, g.created_at
           FROM messages g JOIN users u ON u.id = g.user_id
          WHERE g.trip_id = ?1 AND g.created_at > ?2 ORDER BY g.created_at LIMIT 200`,
      ).bind(tripId, after).all()).results
    : [];

  return c.json({
    trip,
    members: members.results,
    messages,
    chatOpen: t < trip.expires_at && ['open', 'full'].includes(trip.status),
  });
});

// ---------- Chat + Flags ----------
app.post('/trips/:id/messages', async (c) => {
  const u = c.get('user');
  const tripId = c.req.param('id');
  const b = await c.req.json().catch(() => ({}));
  const body = typeof b.body === 'string' ? b.body.trim() : '';
  const kind = b.kind === 'quick' ? 'quick' : 'text';
  const t = now();

  if (body.length < 1 || body.length > TUNABLES.CHAT_CHAR_LIMIT) return fail(c, 'bad_input');

  // Check membership and trip status first (Section 5.7a)
  const memberTrip = await c.env.DB.prepare(
    `SELECT m.status, t.status AS trip_status, t.expires_at
       FROM trip_members m
       JOIN trips t ON t.id = m.trip_id
      WHERE m.trip_id = ?1 AND m.user_id = ?2 AND m.status = 'joined'`
  ).bind(tripId, u.id).first<{ status: string; trip_status: string; expires_at: number }>();

  if (!memberTrip) return fail(c, 'not_a_member', 404);
  if (!['open', 'full'].includes(memberTrip.trip_status) || t >= memberTrip.expires_at) {
    return fail(c, 'chat_closed', 403);
  }

  // Rate Limiting on messages (Step 11.4)
  const recentMsg = await c.env.DB.prepare(
    `SELECT created_at FROM messages WHERE user_id = ?1 AND trip_id = ?2 ORDER BY created_at DESC LIMIT 1`
  ).bind(u.id, tripId).first<{ created_at: number }>();
  if (recentMsg && (t - recentMsg.created_at) < (TUNABLES.MESSAGE_RATE_LIMIT_MS / 1000)) {
    return fail(c, 'rate_limited', 429);
  }

  await c.env.DB.prepare(
    `INSERT INTO messages (id, trip_id, user_id, kind, body, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  ).bind(uuidv7(), tripId, u.id, kind, body, t).run();

  return c.json({ ok: true }, 201);
});

// Flag a message
app.post('/messages/:id/flag', async (c) => {
  const u = c.get('user');
  const t = now();

  // Abuse control: if flagger has >= 3 dismissed flags, they lose flagging ability
  const dismissedCount = await c.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM flags WHERE flagged_by = ?1 AND status = 'dismissed'`
  ).bind(u.id).first<{ c: number }>();
  if (dismissedCount && dismissedCount.c >= 3) {
    return fail(c, 'flagging_disabled', 403);
  }

  const msg = await c.env.DB.prepare(
    `SELECT g.id, g.trip_id, g.user_id, g.created_at, tr.expires_at, tm.role AS sender_role
       FROM messages g
       JOIN trips tr ON tr.id = g.trip_id
       JOIN trip_members m ON m.trip_id = g.trip_id AND m.user_id = ?2 AND m.status = 'joined'
       JOIN trip_members tm ON tm.trip_id = g.trip_id AND tm.user_id = g.user_id
      WHERE g.id = ?1`,
  ).bind(c.req.param('id'), u.id).first<any>();

  if (!msg || t > msg.expires_at + TUNABLES.CHAT_GRACE_AFTER_EXPIRY_SECONDS) {
    return fail(c, 'not_found', 404);
  }
  if (msg.user_id === u.id) return fail(c, 'bad_input');

  const flagId = uuidv7();

  const batchStatements = [
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO flags (id, trip_id, message_id, flagged_user_id, flagged_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(flagId, msg.trip_id, msg.id, msg.user_id, u.id, t),
    c.env.DB.prepare(
      `UPDATE messages SET retain = 1 WHERE trip_id = ?1 AND created_at BETWEEN ?2 AND ?3`
    ).bind(msg.trip_id, msg.created_at - 120, msg.created_at + 120),
  ];

  if (msg.sender_role === 'poster') {
    batchStatements.push(
      c.env.DB.prepare(`UPDATE trip_members SET status = 'removed' WHERE trip_id = ?1 AND user_id = ?2`).bind(msg.trip_id, msg.user_id),
      c.env.DB.prepare(`UPDATE trips SET status = 'cancelled' WHERE id = ?1`).bind(msg.trip_id)
    );
  } else {
    batchStatements.push(
      c.env.DB.prepare(`UPDATE trip_members SET status = 'removed' WHERE trip_id = ?1 AND user_id = ?2`).bind(msg.trip_id, msg.user_id),
      c.env.DB.prepare(`UPDATE trips SET status = 'open' WHERE id = ?1 AND status = 'full'`).bind(msg.trip_id)
    );
  }

  await c.env.DB.batch(batchStatements);
  log('flag.created', { tripId: msg.trip_id, flaggedUser: msg.user_id, flagger: u.id });
  return c.json({ ok: true });
});

// Admin review route for flags
app.get('/admin/flags', async (c) => {
  const adminSecret = c.req.header('X-Admin-Secret') ?? c.req.query('secret');
  if (!c.env.ADMIN_SECRET || adminSecret !== c.env.ADMIN_SECRET) {
    return fail(c, 'unauthorized', 401);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT f.id, f.trip_id, f.message_id, f.flagged_user_id, f.flagged_by, f.status, f.created_at,
            m.body AS message_body, u.first_name AS sender_name
       FROM flags f
       JOIN messages m ON m.id = f.message_id
       JOIN users u ON u.id = f.flagged_user_id
      ORDER BY f.created_at DESC LIMIT 50`
  ).all();
  return c.json({ flags: results });
});

app.post('/admin/flags/:id/review', async (c) => {
  const adminSecret = c.req.header('X-Admin-Secret') ?? c.req.query('secret');
  if (!c.env.ADMIN_SECRET || adminSecret !== c.env.ADMIN_SECRET) {
    return fail(c, 'unauthorized', 401);
  }
  const b = await c.req.json().catch(() => ({}));
  if (!['upheld', 'dismissed'].includes(b.status)) return fail(c, 'bad_input');

  await c.env.DB.prepare(`UPDATE flags SET status = ?1 WHERE id = ?2`)
    .bind(b.status, c.req.param('id')).run();
  return c.json({ ok: true });
});

// ---------- Ping Fan-Out & Web Push ----------
type NewTrip = {
  id: string;
  placeId: string;
  lat: number;
  lng: number;
  visibility: string;
  posterId: string;
};

async function pingNearby(env: Env, trip: NewTrip) {
  const t = now();
  const r = Number(env.PING_RADIUS_M ?? TUNABLES.DEFAULT_PING_RADIUS_M);
  const { dLat, dLng } = box(trip.lat, r);

  const { results } = await env.DB.prepare(
    `SELECT u.id, p.lat, p.lng
       FROM presence p
       JOIN users u ON u.id = p.user_id AND u.status = 'active'
       JOIN saved_places sp ON sp.user_id = u.id AND sp.place_id = ?1
      WHERE p.expires_at > ?2 AND p.user_id != ?3
        AND p.lat BETWEEN ?4 AND ?5 AND p.lng BETWEEN ?6 AND ?7
        AND (?8 = 'all' OR u.gender = 'female')
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
           WHERE (b.blocker_id = u.id AND b.blocked_id = ?3)
              OR (b.blocker_id = ?3 AND b.blocked_id = u.id)
        )
        AND NOT EXISTS (
          SELECT 1 FROM dismissals d
           WHERE d.user_id = u.id AND d.place_id = ?1 AND d.day = ?9 AND d.count >= ?10
        )`,
  ).bind(
    trip.placeId,
    t,
    trip.posterId,
    trip.lat - dLat,
    trip.lat + dLat,
    trip.lng - dLng,
    trip.lng + dLng,
    trip.visibility,
    dayNo(t),
    TUNABLES.DISMISS_MUTE_THRESHOLD
  ).all<any>();

  const near = results.filter((x) => distM(trip.lat, trip.lng, x.lat, x.lng) <= r);
  if (near.length === 0) return log('ping.none', { tripId: trip.id });

  const res = await env.DB.batch(
    near.map((x) => env.DB.prepare(`INSERT OR IGNORE INTO pings (trip_id, user_id, sent_at) VALUES (?1, ?2, ?3)`).bind(trip.id, x.id, t)),
  );
  const fresh = near.filter((_, i) => res[i].meta.changes === 1).map((x) => x.id);
  log('ping.fanout', { tripId: trip.id, candidates: near.length, sent: fresh.length });

  await sendPush(env, fresh, {
    tripId: trip.id,
    placeId: trip.placeId,
    title: 'Someone nearby is leaving now',
    body: 'Tap to see details and share a ride.',
  });
}

async function sendPush(env: Env, userIds: string[], payload: Record<string, string>) {
  if (userIds.length === 0) return;

  const vapidKeys: VapidKeys = {
    subject: env.VAPID_SUBJECT ?? 'mailto:admin@chalo.app',
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };

  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    log('push.stub_no_vapid_keys', { users: userIds.length, payload });
    return;
  }

  const placeholders = userIds.map((_, i) => `?${i + 1}`).join(',');
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (${placeholders})`
  ).bind(...userIds).all<{ id: string; user_id: string; endpoint: string; p256dh: string; auth: string }>();

  if (!results || results.length === 0) {
    log('push.no_subscriptions', { users: userIds.length });
    return;
  }

  for (const sub of results) {
    try {
      const pushSubscription: PushSubscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const pushMessage: PushMessage = {
        data: JSON.stringify(payload),
        options: {
          ttl: 300,
          urgency: 'high',
        },
      };

      const reqData = await buildPushPayload(pushMessage, pushSubscription, vapidKeys);
      const res = await fetch(sub.endpoint, {
        method: reqData.method,
        headers: reqData.headers,
        body: reqData.body,
      });

      if (res.status === 404 || res.status === 410) {
        log('push.subscription_expired', { endpoint: sub.endpoint, status: res.status });
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?1`).bind(sub.endpoint).run();
      } else if (!res.ok) {
        log('push.failed', { endpoint: sub.endpoint, status: res.status });
      } else {
        log('push.delivered', { userId: sub.user_id });
      }
    } catch (err) {
      log('push.error', { endpoint: sub.endpoint, error: String(err) });
    }
  }
}

// ---------- Housekeeping (Cron every minute) ----------
async function housekeeping(env: Env) {
  const t = now();
  await env.DB.batch([
    env.DB.prepare(`UPDATE trips SET status = 'expired' WHERE status IN ('open','full') AND expires_at <= ?1`).bind(t),
    env.DB.prepare(
      `DELETE FROM messages WHERE retain = 0
         AND trip_id IN (SELECT id FROM trips WHERE status IN ('expired','cancelled') AND expires_at <= ?1)`,
    ).bind(t - TUNABLES.CHAT_GRACE_AFTER_EXPIRY_SECONDS),
    env.DB.prepare(`DELETE FROM presence WHERE expires_at <= ?1`).bind(t),
    env.DB.prepare(`DELETE FROM pings WHERE sent_at < ?1`).bind(t - 86400),
    env.DB.prepare(`DELETE FROM dismissals WHERE day < ?1`).bind(dayNo(t) - 1),
  ]);
}

// Global error handler
app.onError((err, c) => {
  metrics.errors++;
  log('error', { path: c.req.path, message: String(err) });
  return c.json({ error: 'internal' }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(housekeeping(env));
  },
};
