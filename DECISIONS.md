# Architectural & Product Decisions

This file records product and implementation decisions for Chalo as required by the project brief.

## 1. Directory Structure
- Cloudflare Workers backend is located in `src/index.ts`, matching `wrangler.toml`'s entry point `main = "src/index.ts"`.
- Frontend is a React + Vite + TypeScript PWA located in `frontend/` (Cloudflare Pages compatible).

## 2. Configuration & Tunables
All tunables from Section 9 are centralized in configuration instead of hard-coded values:
- `PING_RADIUS_M`: 100 meters (configurable via env var, can be widened to 300)
- `BOARD_RADIUS_M`: 1000 meters (configurable via env var)
- `NIGHT_START_HOUR`: 20 (8:00 PM IST)
- `NIGHT_END_HOUR`: 6 (6:00 AM IST)
- `LEAVE_MINUTES_OPTIONS`: [5, 10, 15]
- `SEATS_OPTIONS`: [1, 2, 3]
- `NO_SHOW_WAIT_MINUTES`: 5 minutes
- `PRESENCE_MINUTES_OPTIONS`: [30, 60, 120] (default 30)
- `CHAT_CHAR_LIMIT`: 500 characters
- `CHAT_GRACE_AFTER_EXPIRY_SECONDS`: 3600 (1 hour)
- `DISMISS_MUTE_THRESHOLD`: 2 dismissals per IST day

## 3. Web Push VAPID Implementation (Step 11.1)
- Implemented using `@block65/webcrypto-web-push` which relies exclusively on standard Web Crypto API supported by Cloudflare Workers (unlike Node's `web-push`).
- When sending push notifications, if the endpoint returns HTTP 404 or 410 (unregistered / expired endpoint), the subscription is automatically deleted from `push_subscriptions`.
- VAPID keys are configurable via `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (defaults provided for local testing).

## 4. SQL Placeholders & D1 Compatibility (Step 11.2)
- Replaced `.replaceAll('?V', '?7')` pattern with explicit parameterized indices or positional parameters, ensuring SQLite/D1 prepared statement compatibility across all platforms and test suites.

## 5. Idempotent & Re-join Handling (Step 11.3)
- When a user calls `POST /trips/:id/join`:
  - If the user is already an active member (`status = 'joined'`), the API returns `{ ok: true, already_joined: true }` without checking capacity or raising `trip_full`.
  - If the user was removed (`status = 'removed'`), they are rejected with 403 `removed_cannot_rejoin`.
  - If the user had previously left (`status = 'left'`) and attempts to rejoin, they are allowed if seats are still available; if the trip is full, 409 `trip_full` is returned.

## 6. Rate Limiting (Step 11.4)
- **Trip creation**: Maximum 1 trip per user per 10 seconds (`POST_RATE_LIMIT_S = 10`). Returns 429 `too_many_requests`.
- **Chat messages**: Maximum 1 message per user per second (`MESSAGE_RATE_LIMIT_MS = 1000`). Returns 429 `too_many_messages`.

## 7. Public Health Endpoint (Step 11.5)
- Moved `GET /health` above the auth middleware so uptime monitors and load balancers can probe system health without credentials. Returns `{ ok: true, uptime, metrics }`.

## 8. Single Live Trip Invariant for Members (Step 11.6)
- A user cannot be an active member (`status = 'joined'`) of multiple live trips simultaneously (as either poster or joiner).
- Attempting to join a second live trip or post while active in another live trip returns 409 `already_in_live_trip` / `already_have_live_trip`.

## 9. CORS Policy (Step 11.7)
- Enabled CORS via Hono middleware with support for local development origins (`http://localhost:*`, `http://127.0.0.1:*`) and Cloudflare Pages domains (`https://*.pages.dev` or configured `FRONTEND_URL`).

## 10. Structured Logging & Metrics (Step 11.8)
- Added JSON-structured logging middleware for all requests logging method, path, HTTP status, duration (ms), and authenticated user ID.
- In-memory metrics track request counts and error counts by status code, exposed on `/health`.

## 11. Seed Places (Step 11.9)
- Seeded primary pilot cluster and key transit corridors:
  - **Transit Hubs**: Vadodara Junction Railway Station, Vadodara Airport (BDQ), Parul University Main Gate (Limda).
  - **Bridges & Highway Junctions (NH 48)**: Ajwa Bridge, Kapurai Bridge, Tarsali Bridge, Waghodia Chokdi Bridge, Golden Chokdi Bridge.
  - **Circles & Panigate Landmarks**: Uma Circle, Vrundavan Circle, Panigate Darwaja, The Spot (Panigate), Albatross Complex (Albrost), Bapod Cross Road.
  - **Waghodia Road Societies**: Dove Deck Society, Golden Valley Society, Ananta Shubh, Ananta Swagat, Ananta Sparsh, Ananta Greens, Ananta Saral, Vaikunth Society, Suryanagar Society, Parivar Society, Prabhat Society, Aastha Greens, Shreepati Township.
  - **Ajwa Road Societies**: Kamlanagar Society, Sayaji Park Society, Shreeji Vatika, Sardar Patel Society, Radhakrishna Society, Shanti Park Society, Madhav Park Society.
  - **DMart Locations**: DMart Waghodia Road, DMart Tarsali, DMart Manjalpur, DMart Harni VIP Road, DMart Gotri, DMart Sama Savli Road.
  - **Major Malls**: Inorbit Mall, Eva The Mall, Center Square Mall, Seven Seas Mall.
