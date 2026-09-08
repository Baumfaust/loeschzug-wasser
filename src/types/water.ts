export interface RouteSample {
  distance: number;
  lat: number;
  lng: number;
  elevation: number;
}

export interface Hydrant {
  id: string;
  lat: number;
  lng: number;
  distanceToWaypoint: number;
  tags?: Record<string, string>;
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  elevation: number; // in meters
  manualElevationOverride?: boolean;
  followsRoads?: boolean;
  routeDistance?: number;
  routePath?: [number, number][];
  routeSamples?: RouteSample[];
}

export interface HoseConfig {
  lengthPerHose: number; // default 20m for B-hose
  frictionPer100m: number; // default 1.0 bar per 100m at 800 l/min
  layingFactor: number; // default 1.1 (+10%)
}

export type PumpProfileType = 'pfpn-10-1000' | 'ts-8-8' | 'custom';

export interface PumpConfig {
  profile: PumpProfileType;
  targetFlowRate: number; // l/min
  maxOutputPressure: number; // bar
  minInputPressure: number; // bar, default 1.5
}

export interface PumpStation {
  distance: number; // meters from start
  elevation: number;
  pressureBeforePump: number; // bar
  pumpIndex: number;
}

export interface PressureProfileSample {
  distance: number;
  pressure: number;
  frictionLoss: number;
  elevationEffect: number;
  pumpReset?: boolean;
}

export interface CalculationResult {
  mapDistance: number; // meters
  effectiveDistance: number; // meters
  totalBProvisions: number; // total number of B-hoses rounded up
  frictionLossTotal: number; // friction loss only, in bar
  elevationDeltaTotal: number; // start-to-end elevation difference, in meters
  netPressureLoss: number; // friction loss plus elevation effect, in bar
  pumpStations: PumpStation[];
  segmentDetails: {
    distance: number;
    elevationStart: number;
    elevationEnd: number;
    accumulatedDistance: number;
  }[];
  profileSamples: { distance: number; elevation: number }[];
  pressureProfile: PressureProfileSample[];
}
