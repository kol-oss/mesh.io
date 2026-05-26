export interface BatmanConfiguration {
  penaltyDistance: number;
  penaltyPercent: number;
  elpInterval: number;
  ogmInterval: number;
  purgeTimeout: number;
}

export interface DsdvConfiguration {
  incrementalUpdateInterval: number;
  fullDumpInterval: number;
  routeTimeout: number;
}

export interface AodvConfiguration {
  helloInterval: number;
  routeTimeout: number;
}

export interface OlsrConfiguration {
  helloInterval: number;
  tcInterval: number;
}

export interface DsrConfiguration {
  routeTimeout: number;
}

export type PeerConfiguration =
  | BatmanConfiguration
  | DsdvConfiguration
  | AodvConfiguration
  | OlsrConfiguration
  | DsrConfiguration;
