export const AODV_MIN_HELLO_INTERVAL = 1;
export const AODV_MIN_ROUTE_TIMEOUT = 1;
export const AODV_SEQUENCE_INITIAL = 1;
export const AODV_PATH_DISCOVERY_TTL = 35;
export const AODV_ACTIVE_ROUTE_TIMEOUT = 3;
export const AODV_DELETE_PERIOD = AODV_ACTIVE_ROUTE_TIMEOUT * 2;
export const AODV_HELLO_LIFETIME_FACTOR = 2;

export const AODV_DEFAULT_CONFIGURATION = {
  helloInterval: 2,
  routeTimeout: 6,
};
