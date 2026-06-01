export const SEAT_HOLD_TTL_SECONDS = 900; // 15 minutes (legacy — hold timer removed)

// ── TRID ──────────────────────────────────────────────────────────────────
// Change TRID_START to continue from your existing member database number
export const TRID_START = 2000;
export const OTP_TTL_SECONDS = 300; // 5 minutes
export const OTP_MAX_ATTEMPTS = 3;
export const GPS_TTL_SECONDS = 86400; // 24 hours
export const LEADERBOARD_CACHE_TTL = 3600; // 1 hour
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 100;

export const ECO_POINTS = {
  RIDE_GIVEN: 15,
  RIDE_TAKEN: 10,
  FIVE_STAR_RATING: 5,
  RATING_GIVEN: 2,
  STREAK_5_DAYS: 25,
  STREAK_20_DAYS: 100,
  FIRST_RIDE: 20,
  REFERRAL: 30,
  COMPLETE_PROFILE: 10,
  NO_SHOW_PENALTY: -10,
  LAST_MINUTE_CANCEL: -5,
  GIVER_LAST_MINUTE_CANCEL: -8,
} as const;

export const ECO_LEVEL_THRESHOLDS = {
  SEED: 0,
  SPROUT: 100,
  LEAF: 300,
  TREE: 700,
  FOREST: 1500,
} as const;

export const CO2_PER_KM_PER_PERSON_GRAMS = 120;

export const MATCH_PICKUP_RADIUS_METERS = 500;
export const MATCH_TIME_WINDOW_MINUTES = 30;

export const REDIS_KEYS = {
  SEAT_HOLD: (rideId: string, seekerId: string) => `hold:${rideId}:${seekerId}`,
  GPS: (rideId: string) => `gps:${rideId}`,
  OTP: (phone: string) => `otp:${phone}`,
  LEADERBOARD_MONTHLY: 'leaderboard:monthly',
  LEADERBOARD_ALLTIME: 'leaderboard:alltime',
  RATE_LIMIT: (ip: string) => `ratelimit:${ip}`,
} as const;
