// Centralized tunables and configuration for Chalo.
// All values from Section 9 of the specification are defined here as config values.

export const TUNABLES = {
  // Radius tunables
  DEFAULT_PING_RADIUS_M: 100, // widen to 300 if pings rarely match during test
  DEFAULT_BOARD_RADIUS_M: 1000,

  // Night window (IST): 20:00 (8 PM) to 06:00 (6 AM)
  NIGHT_START_HOUR: 20,
  NIGHT_END_HOUR: 6,

  // Options
  LEAVE_OPTIONS_MINUTES: [5, 10, 15] as const,
  SEATS_OPTIONS: [1, 2, 3] as const,
  NO_SHOW_WAIT_MINUTES: 5,
  PRESENCE_OPTIONS_MINUTES: [30, 60, 120] as const,
  PRESENCE_DEFAULT_MINUTES: 30,

  // Limits & Thresholds
  CHAT_CHAR_LIMIT: 500,
  CHAT_GRACE_AFTER_EXPIRY_SECONDS: 3600, // 1 hour
  DISMISS_MUTE_THRESHOLD: 2, // 2 dismissals per IST day

  // Rate Limiting (Step 11.4)
  POST_RATE_LIMIT_SECONDS: 10, // min 10s between posts
  MESSAGE_RATE_LIMIT_MS: 1000,  // min 1s between messages

  // Distances
  DISTANCE_BUCKET_METERS: 50,
};
