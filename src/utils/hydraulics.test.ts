import { describe, expect, it } from 'vitest';
import { calculateWaterRelay } from './hydraulics';
import { type HoseConfig, type PumpConfig, type Waypoint } from '../types/water';

const hoseConfig: HoseConfig = { lengthPerHose: 20, frictionPer100m: 0.1, layingFactor: 1.1 };
const pumpConfig: PumpConfig = { profile: 'pfpn-10-1000', targetFlowRate: 1000, maxOutputPressure: 10, minInputPressure: 1.5 };

describe('calculateWaterRelay', () => {
  it('returns an empty result for fewer than two waypoints', () => {
    expect(calculateWaterRelay([], hoseConfig, pumpConfig).mapDistance).toBe(0);
  });

  it('uses routed segment distances and route elevation samples', () => {
    const waypoints: Waypoint[] = [
      { id: 'a', lat: 51, lng: 7, elevation: 100 },
      {
        id: 'b', lat: 51.01, lng: 7.01, elevation: 120, routeDistance: 5000,
        routeSamples: [
          { distance: 0, lat: 51, lng: 7, elevation: 100 },
          { distance: 2500, lat: 51.005, lng: 7.005, elevation: 105 },
          { distance: 5000, lat: 51.01, lng: 7.01, elevation: 120 },
        ],
      },
    ];
    const result = calculateWaterRelay(waypoints, hoseConfig, pumpConfig);
    expect(result.mapDistance).toBe(5000);
    expect(result.profileSamples).toHaveLength(3);
    expect(result.totalBProvisions).toBe(Math.ceil(5500 / 20));
  });
});
