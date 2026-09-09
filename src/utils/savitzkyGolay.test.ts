import { describe, expect, it } from 'vitest';
import { smoothElevationProfile } from './savitzkyGolay';

describe('smoothElevationProfile', () => {
  it('preserves route distances and endpoint elevations', () => {
    const samples = [
      { distance: 0, elevation: 100 },
      { distance: 40, elevation: 104 },
      { distance: 90, elevation: 108 },
      { distance: 150, elevation: 112 },
    ];

    const result = smoothElevationProfile(samples);

    expect(result.map((sample) => sample.distance)).toEqual(samples.map((sample) => sample.distance));
    expect(result[0].elevation).toBe(100);
    expect(result.at(-1)?.elevation).toBe(112);
  });

  it('reduces a local elevation spike without creating an unrealistic value', () => {
    const samples = [
      { distance: 0, elevation: 100 },
      { distance: 50, elevation: 101 },
      { distance: 100, elevation: 130 },
      { distance: 150, elevation: 102 },
      { distance: 200, elevation: 103 },
    ];

    const result = smoothElevationProfile(samples);

    expect(result[2].elevation).toBeLessThan(samples[2].elevation);
    expect(result[2].elevation).toBeGreaterThanOrEqual(101);
    expect(result[2].elevation).toBeLessThanOrEqual(130);
    expect(result.every((sample) => Number.isFinite(sample.elevation))).toBe(true);
  });

  it('returns short profiles unchanged and does not overshoot local terrain', () => {
    const samples = [
      { distance: 0, elevation: 245 },
      { distance: 10, elevation: 246 },
    ];

    expect(smoothElevationProfile(samples)).toEqual(samples);

    const terrain = Array.from({ length: 7 }, (_, index) => ({
      distance: index * 25,
      elevation: 300 + index * 2 + (index === 3 ? 8 : 0),
    }));
    const result = smoothElevationProfile(terrain);
    expect(result.every((sample, index) => sample.elevation >= Math.min(...terrain.slice(Math.max(0, index - 2), index + 3).map((point) => point.elevation)))).toBe(true);
    expect(result.every((sample, index) => sample.elevation <= Math.max(...terrain.slice(Math.max(0, index - 2), index + 3).map((point) => point.elevation)))).toBe(true);
  });
});
