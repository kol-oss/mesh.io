export interface BatmanConfiguration {
  distancePenaltyDistance: number;
  distancePenaltyPercent: number;
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

export type DsrConfiguration = Record<string, never>;

export type PeerConfiguration =
  | BatmanConfiguration
  | DsdvConfiguration
  | AodvConfiguration
  | OlsrConfiguration
  | DsrConfiguration;
