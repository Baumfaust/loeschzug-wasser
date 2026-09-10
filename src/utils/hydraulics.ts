import { type Waypoint, type HoseConfig, type PumpConfig, type PumpProfileType, type CalculationResult, type PumpStation, type PressureProfileSample } from '../types/water';
import { calculateDistance } from './elevation';
import { ELEVATION_SAMPLE_INTERVAL_METERS } from './route';

export function calculateWaterRelay(
  waypoints: Waypoint[],
  hoseConfig: HoseConfig,
  pumpConfig: PumpConfig,
  pumpPositions: Record<number, number> = {},
  pumpProfiles: Record<number, PumpProfileType> = {},
): CalculationResult {
  if (waypoints.length < 2) {
    return {
      mapDistance: 0,
      effectiveDistance: 0,
      totalBProvisions: 0,
      frictionLossTotal: 0,
      elevationDeltaTotal: 0,
      netPressureLoss: 0,
      pumpStations: [],
      segmentDetails: [],
      profileSamples: [],
      pressureProfile: [],
    };
  }

  let mapDistance = 0;
  const segmentDetails: {
    distance: number;
    elevationStart: number;
    elevationEnd: number;
    accumulatedDistance: number;
  }[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const dist = p2.routeDistance ?? calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    mapDistance += dist;
    segmentDetails.push({
      distance: dist,
      elevationStart: p1.elevation,
      elevationEnd: p2.elevation,
      accumulatedDistance: mapDistance,
    });
  }

  const manualPumpDistances = Object.values(pumpPositions)
    .filter((distance) => Number.isFinite(distance) && distance > 0 && distance < mapDistance)
    .sort((a, b) => a - b);
  const profileSamples = addPumpDistances(buildProfileSamples(waypoints), manualPumpDistances);
  const effectiveDistance = mapDistance * hoseConfig.layingFactor;
  const totalBProvisions = Math.ceil(effectiveDistance / hoseConfig.lengthPerHose);

  // Hydraulic Relay Pump Placement Algorithm
  // Start at source with Max Output Pressure
  let currentPressure = pumpConfig.maxOutputPressure;
  let accumulatedDist = 0;
  const pumpStations: PumpStation[] = [];
  let pumpIndex = 1;

  // We can simulate step-by-step or segment-by-segment
  // Let's break down into small meter steps (e.g. every 1m or per segment) for high precision
  let totalFrictionLoss = 0;
  const pressureProfile: PressureProfileSample[] = [{ distance: 0, pressure: pumpConfig.maxOutputPressure, frictionLoss: 0, elevationEffect: 0 }];
  const totalElevationDelta = profileSamples.length > 1
    ? profileSamples[profileSamples.length - 1].elevation - profileSamples[0].elevation
    : waypoints[waypoints.length - 1].elevation - waypoints[0].elevation;

  // Let's trace along the effective path
  // For each segment, calculate gradient and friction loss incrementally
  let currentElev = profileSamples[0]?.elevation ?? waypoints[0].elevation;

  for (let sampleIndex = 1; sampleIndex < profileSamples.length; sampleIndex++) {
    const previousSample = profileSamples[sampleIndex - 1];
    const sample = profileSamples[sampleIndex];
    const stepMapDist = sample.distance - previousSample.distance;
    if (stepMapDist <= 0) continue;

    accumulatedDist = sample.distance;
    currentElev = sample.elevation;
    const stepEffDist = stepEffDistRatio(stepMapDist, hoseConfig.layingFactor);
    const stepElevChange = sample.elevation - previousSample.elevation;
    const stepFriction = (stepEffDist / 100) * hoseConfig.frictionPer100m;

    {
      // Pressure drop due to friction
      const frictionDrop = stepFriction;
      // Pressure drop/gain due to elevation (Delta h in meters / 10 = bar)
      // If going up, elevation pressure change is positive (pressure drops). If going down, negative (pressure increases).
      const elevationDrop = stepElevChange / 10;

      const totalDrop = frictionDrop + elevationDrop;
      currentPressure -= totalDrop;
      totalFrictionLoss += frictionDrop;
      pressureProfile.push({
        distance: accumulatedDist,
        pressure: currentPressure,
        frictionLoss: totalFrictionLoss,
        elevationEffect: sample.elevation - profileSamples[0].elevation,
      });

      // A manually positioned pump takes priority over automatic threshold placement.
      const currentPumpIndex = pumpIndex;
      const currentPumpConfig = getPumpConfig(pumpConfig, pumpProfiles[currentPumpIndex]);
      const requestedDistance = pumpPositions[currentPumpIndex];
      const hasManualPosition = Number.isFinite(requestedDistance);
      const manualPositionReached = hasManualPosition && accumulatedDist >= requestedDistance;
      const automaticPositionReached = !hasManualPosition && currentPressure <= currentPumpConfig.minInputPressure;
      if ((manualPositionReached || automaticPositionReached) && sampleIndex < profileSamples.length - 1) {
        const stationDistance = hasManualPosition
          ? Math.max(1, Math.min(mapDistance - 1, requestedDistance))
          : accumulatedDist;
        pumpIndex++;
        pumpStations.push({
          distance: stationDistance,
          elevation: elevationAtDistance(profileSamples, stationDistance),
          pressureBeforePump: currentPressure + totalDrop, // pressure right before drop or at threshold
          pumpIndex: currentPumpIndex,
        });
        // Reset pressure to the selected pump model's output.
        currentPressure = currentPumpConfig.maxOutputPressure;
        pressureProfile.push({
          distance: accumulatedDist,
          pressure: currentPressure,
          frictionLoss: totalFrictionLoss,
          elevationEffect: currentElev - profileSamples[0].elevation,
          pumpReset: true,
        });
      }
    }
  }

  return {
    mapDistance,
    effectiveDistance,
    totalBProvisions,
    frictionLossTotal: Number(totalFrictionLoss.toFixed(2)),
    elevationDeltaTotal: Number(totalElevationDelta.toFixed(1)),
    netPressureLoss: Number((totalFrictionLoss + totalElevationDelta / 10).toFixed(2)),
    pumpStations,
    segmentDetails,
    profileSamples,
    pressureProfile,
    pumpPositions,
  };
}

function buildProfileSamples(waypoints: Waypoint[]) {
  const samples: { distance: number; elevation: number }[] = [];
  let accumulated = 0;

  for (let index = 0; index < waypoints.length - 1; index++) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const distance = end.routeDistance ?? calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const validRouteSamples = end.routeSamples?.filter((sample) =>
      Number.isFinite(sample.distance) && Number.isFinite(sample.elevation) && sample.distance >= 0 && sample.distance <= distance,
    );
    const routeSamples = validRouteSamples?.length &&
      validRouteSamples[0].distance === 0 &&
      validRouteSamples[validRouteSamples.length - 1].distance === distance
      ? validRouteSamples
      : undefined;

    if (routeSamples?.length) {
      for (const sample of routeSamples) {
        if (samples.length > 0 && sample.distance === 0) continue;
        samples.push({ distance: accumulated + sample.distance, elevation: sample.elevation });
      }
    } else {
      const steps = Math.max(1, Math.ceil(distance / ELEVATION_SAMPLE_INTERVAL_METERS));
      for (let step = 0; step <= steps; step++) {
        if (index > 0 && step === 0) continue;
        const ratio = step / steps;
        samples.push({
          distance: accumulated + distance * ratio,
          elevation: start.elevation + (end.elevation - start.elevation) * ratio,
        });
      }
    }

    accumulated += distance;
  }

  return samples;
}

function addPumpDistances(samples: { distance: number; elevation: number }[], distances: number[]) {
  const additions = distances.filter((distance) => !samples.some((sample) => Math.abs(sample.distance - distance) < 0.01));
  return [...samples, ...additions.map((distance) => ({ distance, elevation: elevationAtDistance(samples, distance) }))]
    .sort((a, b) => a.distance - b.distance);
}

function getPumpConfig(globalConfig: PumpConfig, profile?: PumpProfileType): PumpConfig {
  if (profile === 'pfpn-10-1000') return { ...globalConfig, profile, targetFlowRate: 1000, maxOutputPressure: 10, minInputPressure: 1.5 };
  if (profile === 'ts-8-8') return { ...globalConfig, profile, targetFlowRate: 800, maxOutputPressure: 8, minInputPressure: 1.5 };
  return globalConfig;
}

function stepEffDistRatio(stepMapDist: number, layingFactor: number): number {
  return stepMapDist * layingFactor;
}

function elevationAtDistance(samples: { distance: number; elevation: number }[], distance: number): number {
  if (samples.length === 0) return 0;
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (distance <= current.distance) {
      const ratio = current.distance > previous.distance
        ? (distance - previous.distance) / (current.distance - previous.distance)
        : 0;
      return previous.elevation + (current.elevation - previous.elevation) * ratio;
    }
  }
  return samples[samples.length - 1].elevation;
}
