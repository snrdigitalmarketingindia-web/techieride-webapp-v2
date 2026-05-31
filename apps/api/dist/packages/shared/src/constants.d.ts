export declare const SEAT_HOLD_TTL_SECONDS = 900;
export declare const OTP_TTL_SECONDS = 300;
export declare const OTP_MAX_ATTEMPTS = 3;
export declare const GPS_TTL_SECONDS = 86400;
export declare const LEADERBOARD_CACHE_TTL = 3600;
export declare const RATE_LIMIT_WINDOW_MS = 60000;
export declare const RATE_LIMIT_MAX = 100;
export declare const ECO_POINTS: {
    readonly RIDE_GIVEN: 15;
    readonly RIDE_TAKEN: 10;
    readonly FIVE_STAR_RATING: 5;
    readonly RATING_GIVEN: 2;
    readonly STREAK_5_DAYS: 25;
    readonly STREAK_20_DAYS: 100;
    readonly FIRST_RIDE: 20;
    readonly REFERRAL: 30;
    readonly COMPLETE_PROFILE: 10;
    readonly NO_SHOW_PENALTY: -10;
    readonly LAST_MINUTE_CANCEL: -5;
    readonly GIVER_LAST_MINUTE_CANCEL: -8;
};
export declare const ECO_LEVEL_THRESHOLDS: {
    readonly SEED: 0;
    readonly SPROUT: 100;
    readonly LEAF: 300;
    readonly TREE: 700;
    readonly FOREST: 1500;
};
export declare const CO2_PER_KM_PER_PERSON_GRAMS = 120;
export declare const MATCH_PICKUP_RADIUS_METERS = 500;
export declare const MATCH_TIME_WINDOW_MINUTES = 30;
export declare const REDIS_KEYS: {
    readonly SEAT_HOLD: (rideId: string, seekerId: string) => string;
    readonly GPS: (rideId: string) => string;
    readonly OTP: (phone: string) => string;
    readonly LEADERBOARD_MONTHLY: "leaderboard:monthly";
    readonly LEADERBOARD_ALLTIME: "leaderboard:alltime";
    readonly RATE_LIMIT: (ip: string) => string;
};
