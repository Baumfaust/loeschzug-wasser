import { type Waypoint, type HoseConfig, type PumpConfig, type CalculationResult, type PumpStation } from '../types/water';
import { calculateDistance } from './elevation';

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
    const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    mapDistance += dist;
    segmentDetails.push({
      distance: dist,
      elevationStart: p1.elevation,
      elevationEnd: p2.elevation,
      accumulatedDistance: mapDistance,
    });
  }

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
  let totalElevationDelta = waypoints[waypoints.length - 1].elevation - waypoints[0].elevation;

  // Let's trace along the effective path
  // For each segment, calculate gradient and friction loss incrementally
  let currentElev = waypoints[0].elevation;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const segMapDist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
    if (segMapDist === 0) continue;

    const elevChange = p2.elevation - p1.elevation;
    
    // We can step through the segment in 10-meter increments or continuously
    const steps = Math.max(1, Math.floor(segMapDist / 5)); // check every 5 meters
    const stepMapDist = segMapDist / steps;
    const stepEffDist = stepEffDistRatio(stepMapDist, hoseConfig.layingFactor);
    const stepElevChange = elevChange / steps;
    const stepFriction = (stepEffDist / 100) * hoseConfig.frictionPer100m;

    for (let s = 0; s < steps; s++) {
      accumulatedDist += stepMapDist;
      currentElev += stepElevChange;

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
      if (currentPressure <= pumpConfig.minInputPressure && (i < waypoints.length - 2 || s < steps - 1)) {
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
  };
}

function stepEffDistRatio(stepMapDist: number, layingFactor: number): number {
  return stepMapDist * layingFactor;
}
