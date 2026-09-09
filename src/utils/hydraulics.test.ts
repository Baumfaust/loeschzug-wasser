import { describe, expect, it } from 'vitest';
import { calculateDistance } from './elevation';
import { calculateWaterRelay } from './hydraulics';
import { type HoseConfig, type PumpConfig, type Waypoint } from '../types/water';

const pumpConfig: PumpConfig = { profile: 'pfpn-10-1000', targetFlowRate: 1000, maxOutputPressure: 10, minInputPressure: 1.5 };
const hose = (frictionPer100m = 1, layingFactor = 1): HoseConfig => ({ lengthPerHose: 20, frictionPer100m, layingFactor });
const point = (id: string, elevation = 100, lat = 51, lng = 7): Waypoint => ({ id, lat, lng, elevation });
const routedEnd = (elevation: number, distance: number, routeSamples: Waypoint['routeSamples']): Waypoint => ({
  ...point('end', elevation, 51.01, 7.01), routeDistance: distance, routeSamples,
});

function resultFor(end: Waypoint, start = point('start'), config = hose()) {
  return calculateWaterRelay([start, end], config, pumpConfig);
}

describe('calculateWaterRelay: empty and basic cases', () => {
  it('returns zero for no waypoints', () => {
    const result = calculateWaterRelay([], hose(), pumpConfig);
    expect(result).toMatchObject({ mapDistance: 0, frictionLossTotal: 0, elevationDeltaTotal: 0, netPressureLoss: 0 });
    expect(result.pressureProfile).toEqual([]);
  });

  it('returns zero for one waypoint', () => {
    const result = calculateWaterRelay([point('only')], hose(), pumpConfig);
    expect(result).toMatchObject({ mapDistance: 0, effectiveDistance: 0, totalBProvisions: 0, netPressureLoss: 0 });
    expect(result.profileSamples).toEqual([]);
  });

  it('uses haversine distance when no routed distance exists', () => {
    const start = point('start', 100, 51, 7);
    const end = point('end', 100, 51.001, 7.001);
    const result = resultFor(end, start, hose(1, 1));
    const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
    expect(result.mapDistance).toBeCloseTo(distance, 6);
    expect(result.frictionLossTotal).toBeCloseTo(distance / 100, 2);
  });

  it('uses explicit routed distance instead of straight-line distance', () => {
    const result = resultFor(routedEnd(100, 730, undefined), point('start'), hose(1, 1));
    expect(result.mapDistance).toBe(730);
    expect(result.frictionLossTotal).toBe(7.3);
  });
});

describe('calculateWaterRelay: pressure components', () => {
  it('applies the laying factor exactly once to friction', () => {
    const result = resultFor(routedEnd(100, 730, undefined), point('start'), hose(1, 1.1));
    expect(result.effectiveDistance).toBeCloseTo(803, 10);
    expect(result.frictionLossTotal).toBe(8.03);
    expect(result.netPressureLoss).toBe(8.03);
    expect(result.pressureProfile[0]).toMatchObject({ distance: 0, pressure: 10, frictionLoss: 0 });
    expect(result.pressureProfile.at(-1)?.pressure).toBeCloseTo(1.97, 2);
  });

  it('adds 1 bar per 10 m of uphill elevation', () => {
    const result = calculateWaterRelay(
      [point('start', 100), routedEnd(130, 730, undefined)],
      hose(1, 1),
      { ...pumpConfig, minInputPressure: -100 },
    );
    expect(result.elevationDeltaTotal).toBe(30);
    expect(result.frictionLossTotal).toBe(7.3);
    expect(result.netPressureLoss).toBe(10.3);
    const terminalSample = result.pressureProfile.find((sample) => sample.distance === result.mapDistance);
    expect(terminalSample?.pressure).toBeCloseTo(-0.3, 2);
  });

  it('subtracts downhill elevation from net pressure loss', () => {
    const result = resultFor(routedEnd(70, 730, undefined), point('start', 100), hose(1, 1));
    expect(result.elevationDeltaTotal).toBe(-30);
    expect(result.frictionLossTotal).toBe(7.3);
    expect(result.netPressureLoss).toBe(4.3);
    expect(result.pressureProfile.at(-1)?.pressure).toBeCloseTo(5.7, 2);
  });

  it('keeps friction loss independent from elevation', () => {
    const uphill = resultFor(routedEnd(130, 730, undefined), point('start', 100), hose(1, 1));
    const downhill = resultFor(routedEnd(70, 730, undefined), point('start', 100), hose(1, 1));
    expect(uphill.frictionLossTotal).toBe(downhill.frictionLossTotal);
  });

  it('uses route samples for the elevation profile and endpoint delta', () => {
    const result = resultFor(routedEnd(120, 5000, [
      { distance: 0, lat: 51, lng: 7, elevation: 100 },
      { distance: 2500, lat: 51.005, lng: 7.005, elevation: 105 },
      { distance: 5000, lat: 51.01, lng: 7.01, elevation: 120 },
    ]), point('start'), hose(1, 1));
    expect(result.profileSamples).toHaveLength(3);
    expect(result.elevationDeltaTotal).toBe(20);
    expect(result.netPressureLoss).toBe(52);
  });

  it('does not count a zero-length segment as distance or friction', () => {
    const start = point('start', 100, 51, 7);
    const result = resultFor(point('end', 100, 51, 7), start, hose(1, 1));
    expect(result.mapDistance).toBe(0);
    expect(result.frictionLossTotal).toBe(0);
    expect(result.netPressureLoss).toBe(0);
  });

  it('rounds displayed pressure values without changing calculation scale', () => {
    const result = resultFor(routedEnd(101, 123.456, undefined), point('start'), hose(0.73, 1.07));
    expect(result.frictionLossTotal).toBe(0.96);
    expect(result.netPressureLoss).toBe(1.06);
  });

  it('ignores invalid route samples and falls back to interpolation', () => {
    const result = resultFor(routedEnd(120, 100, [
      { distance: -1, lat: 51, lng: 7, elevation: 999 },
      { distance: 50, lat: 51.005, lng: 7.005, elevation: 110 },
      { distance: 101, lat: 51.01, lng: 7.01, elevation: 999 },
      { distance: 75, lat: 51.007, lng: 7.007, elevation: Number.NaN },
    ]), point('start'), hose(1, 1));
    expect(result.profileSamples.length).toBeGreaterThan(1);
    expect(result.profileSamples[0]).toMatchObject({ distance: 0, elevation: 100 });
    expect(result.profileSamples.at(-1)).toMatchObject({ distance: 100, elevation: 120 });
    expect(result.netPressureLoss).toBe(3);
  });
});

describe('calculateWaterRelay: hose and pump behavior', () => {
  it('rounds hose count upward after applying laying factor', () => {
    const result = resultFor(routedEnd(100, 20.01, undefined), point('start'), hose(1, 1));
    expect(result.totalBProvisions).toBe(2);
  });

  it('does not add a pump when pressure stays above the minimum', () => {
    const result = resultFor(routedEnd(100, 100, undefined), point('start'), hose(0.1, 1));
    expect(result.pumpStations).toHaveLength(0);
  });

  it('adds relay pumps when pressure falls below the configured minimum', () => {
    const result = resultFor(routedEnd(100, 1000, undefined), point('start'), hose(1, 1));
    expect(result.pumpStations.length).toBeGreaterThan(0);
    expect(result.pumpStations.every((pump) => pump.distance > 0 && pump.distance < 1000)).toBe(true);
    expect(result.pressureProfile.some((sample) => sample.pumpReset && sample.pressure === pumpConfig.maxOutputPressure)).toBe(true);
  });

  it('recalculates the pressure reset at a manually moved pump position', () => {
    const result = calculateWaterRelay(
      [point('start'), routedEnd(100, 1000, undefined)],
      hose(1, 1),
      pumpConfig,
      { 1: 400 },
    );

    expect(result.pumpStations[0]).toMatchObject({ pumpIndex: 1, distance: 400 });
    expect(result.pressureProfile).toContainEqual(expect.objectContaining({
      distance: 400,
      pressure: pumpConfig.maxOutputPressure,
      pumpReset: true,
    }));
    expect(result.pressureProfile.find((sample) => sample.distance === 400)?.frictionLoss).toBeCloseTo(4, 10);
  });

  it('handles many routed segments without losing accumulated distance', () => {
    const waypoints = Array.from({ length: 101 }, (_, index) => ({
      ...point(`wp-${index}`, 100, 51 + index * 0.001, 7),
      ...(index > 0 ? { routeDistance: 10 } : {}),
    }));
    const result = calculateWaterRelay(waypoints, hose(1, 1), pumpConfig);
    expect(result.mapDistance).toBe(1000);
    expect(result.segmentDetails).toHaveLength(100);
    expect(result.segmentDetails.at(-1)?.accumulatedDistance).toBe(1000);
  });
});
