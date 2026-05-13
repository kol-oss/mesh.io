// validation
export const BATMAN_MIN_OGM_INTERVAL = 1;
export const BATMAN_MIN_ELP_INTERVAL = 1;
export const BATMAN_MIN_PURGE_TIMEOUT = 1;
export const BATMAN_MIN_DISTANCE_PENALTY = 1;
export const BATMAN_MIN_PENALTY_PERCENT = 0;

// simulation configuration
export const BATMAN_VERSION = 5;
export const BATMAN_TIME_TO_LIVE = 50;
export const BATMAN_PROTECTION_WINDOW_SIZE = 64;
export const BATMAN_OGM_HOP_PENALTY_PERCENT = 5.8;
export const BATMAN_MAX_THROUGHPUT = 2 ** 32;
export const BATMAN_WIRELESS_BASE_THROUGHPUT = 100;
export const BATMAN_STATIC_BASE_THROUGHPUT = 1000;
export const BATMAN_EWMA_ALPHA = 0.2;

// default configuration
export const BATMAN_DEFAULT_CONFIGURATION = {
  distancePenaltyDistance: 75,
  distancePenaltyPercent: 5,
  elpInterval: BATMAN_MIN_ELP_INTERVAL,
  ogmInterval: BATMAN_MIN_OGM_INTERVAL,
  purgeTimeout: 10,
};
