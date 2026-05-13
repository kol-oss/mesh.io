export interface BatmanConfiguration {
  batmanDistancePenaltyDistance: number;
  batmanDistancePenaltyPercent: number;
  batmanElpInterval: number;
  batmanOgmInterval: number;
  batmanPurgeTimeout: number;
}

export interface DsdvConfiguration {
  dsdvIncrementalUpdateInterval: number;
  dsdvFullDumpInterval: number;
  dsdvRouteTimeout: number;
}

export interface AodvConfiguration {
  aodvHelloInterval: number;
  aodvRouteTimeout: number;
}

export interface OlsrConfiguration {
  olsrHelloInterval: number;
  olsrTcInterval: number;
}

export type DsrConfiguration = Record<never, never>;

export type DaemonConfiguration = BatmanConfiguration &
  DsdvConfiguration &
  AodvConfiguration &
  OlsrConfiguration &
  DsrConfiguration;
