-- Chalo schema for Cloudflare D1 (SQLite).
-- Times are unix epoch seconds (UTC). IDs are UUIDv7 text generated in the Worker.

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT NOT NULL UNIQUE,
  first_name  TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 40),
  -- self-declared, optional; drives the night women-only rule
  gender      TEXT NOT NULL DEFAULT 'unspecified'
              CHECK (gender IN ('female','male','other','unspecified')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','banned')),
  created_at  INTEGER NOT NULL
);

CREATE TABLE places (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL COLLATE NOCASE CHECK (length(name) BETWEEN 2 AND 80),
  kind        TEXT NOT NULL CHECK (kind IN ('station','airport','mall','society','office','other')),
  lat         REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng         REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL, -- NULL = seeded by us
  created_at  INTEGER NOT NULL,
  UNIQUE (kind, name)
);

-- Shortcuts for posting and the destination filter for pings. Never ping by themselves.
CREATE TABLE saved_places (
  user_id   TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  place_id  TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, place_id)
);
CREATE INDEX idx_saved_places_place ON saved_places(place_id);

-- "I'm around": last known location, auto-expiring. Never returned by any API.
CREATE TABLE presence (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lat         REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng         REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  updated_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  CHECK (expires_at > updated_at)
);
CREATE INDEX idx_presence_lat ON presence(lat);

-- Lifecycle: open -> full <-> open -> expired | cancelled
CREATE TABLE trips (
  id            TEXT PRIMARY KEY,
  poster_id     TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  place_id      TEXT NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
  origin_lat    REAL NOT NULL CHECK (origin_lat BETWEEN -90 AND 90),
  origin_lng    REAL NOT NULL CHECK (origin_lng BETWEEN -180 AND 180),
  seats_wanted  INTEGER NOT NULL CHECK (seats_wanted BETWEEN 1 AND 3), -- others, excluding poster
  leave_at      INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL, -- leave_at + 5 min no-show wait
  visibility    TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all','women_only')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','expired','cancelled')),
  created_at    INTEGER NOT NULL,
  CHECK (leave_at >= created_at AND expires_at >= leave_at)
);
CREATE INDEX idx_trips_poster ON trips(poster_id);
CREATE INDEX idx_trips_place  ON trips(place_id);
CREATE INDEX idx_trips_active_lat ON trips(origin_lat) WHERE status IN ('open','full');
-- One live trip per poster.
CREATE UNIQUE INDEX uq_trips_one_live_per_poster ON trips(poster_id) WHERE status IN ('open','full');

CREATE TABLE trip_members (
  trip_id    TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('poster','joiner')),
  status     TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','left','removed')),
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX idx_trip_members_user ON trip_members(user_id);

-- Seat capacity enforced by the database, so two simultaneous joins cannot overfill a trip.
CREATE TRIGGER trg_trip_capacity
BEFORE INSERT ON trip_members
WHEN NEW.role = 'joiner'
 AND (SELECT COUNT(*) FROM trip_members
      WHERE trip_id = NEW.trip_id AND role = 'joiner' AND status = 'joined')
     >= (SELECT seats_wanted FROM trips WHERE id = NEW.trip_id)
BEGIN
  SELECT RAISE(ABORT, 'trip_full');
END;

CREATE TABLE messages (
  id          TEXT PRIMARY KEY,
  trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','quick')),
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at  INTEGER NOT NULL,
  retain      INTEGER NOT NULL DEFAULT 0 CHECK (retain IN (0,1)) -- 1 = kept as report evidence
);
CREATE INDEX idx_messages_trip ON messages(trip_id, created_at);

-- A flag is also the user report. One flag removes the sender from the trip immediately.
CREATE TABLE flags (
  id               TEXT PRIMARY KEY,
  trip_id          TEXT NOT NULL REFERENCES trips(id)    ON DELETE CASCADE,
  message_id       TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  flagged_user_id  TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  flagged_by       TEXT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','dismissed')),
  created_at       INTEGER NOT NULL,
  CHECK (flagged_user_id <> flagged_by),
  UNIQUE (message_id, flagged_by)
);
CREATE INDEX idx_flags_user   ON flags(flagged_user_id);
CREATE INDEX idx_flags_status ON flags(status);

CREATE TABLE blocks (
  blocker_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Dismiss a destination's ping twice in one (IST) day and it is muted for that day.
CREATE TABLE dismissals (
  user_id   TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  place_id  TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  day       INTEGER NOT NULL, -- days since epoch, IST
  count     INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (user_id, place_id, day)
);

-- One ping per trip per user, ever.
CREATE TABLE pings (
  trip_id  TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at  INTEGER NOT NULL,
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX idx_pings_sent ON pings(sent_at);

CREATE TABLE push_subscriptions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_push_user ON push_subscriptions(user_id);
