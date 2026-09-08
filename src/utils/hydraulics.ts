import { type Waypoint, type HoseConfig, type PumpConfig, type CalculationResult, type PumpStation } from '../types/water';
import { calculateDistance } from './elevation';
import { ELEVATION_SAMPLE_INTERVAL_METERS } from './route';

export function calculateWaterRelay(
  waypoints: Waypoint[],
  hoseConfig: HoseConfig,
  pumpConfig: PumpConfig
): CalculationResult {
  if (waypoints.length < 2) {
    return {
      mapDistance: 0,
      effectiveDistance: 0,
      totalBProvisions: 0,
      frictionLossTotal: 0,
      elevationDeltaTotal: 0,
      pumpStations: [],
      segmentDetails: [],
      profileSamples: [],
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

  const profileSamples = buildProfileSamples(waypoints);
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

      // Check if we need a relay pump before reaching the next step (if pressure falls below minInputPressure)
      // Except if this is the very last point
      if (currentPressure <= pumpConfig.minInputPressure && sampleIndex < profileSamples.length - 1) {
        // Place pump here!
        pumpStations.push({
          distance: accumulatedDist,
          elevation: currentElev,
          pressureBeforePump: currentPressure + totalDrop, // pressure right before drop or at threshold
          pumpIndex: pumpIndex++,
        });
        // Reset pressure to max output pressure
        currentPressure = pumpConfig.maxOutputPressure;
      }
    }
  }

  return {
    mapDistance,
    effectiveDistance,
    totalBProvisions,
    frictionLossTotal: Number(totalFrictionLoss.toFixed(2)),
    elevationDeltaTotal: Number(totalElevationDelta.toFixed(1)),
    pumpStations,
    segmentDetails,
    profileSamples,
  };
}

function buildProfileSamples(waypoints: Waypoint[]) {
  const samples: { distance: number; elevation: number }[] = [];
  let accumulated = 0;

  for (let index = 0; index < waypoints.length - 1; index++) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const distance = end.routeDistance ?? calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const routeSamples = end.routeSamples;

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

function stepEffDistRatio(stepMapDist: number, layingFactor: number): number {
  return stepMapDist * layingFactor;
}
