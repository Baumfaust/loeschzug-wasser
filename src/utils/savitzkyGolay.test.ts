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

describe('smoothElevationProfile with a window in metres', () => {
  const stairs = Array.from({ length: 41 }, (_, index) => ({
    distance: index * 5,
    elevation: 100 + Math.floor(index / 6) * 1,
  }));

  it('keeps samples unchanged when the window holds fewer than three samples', () => {
    expect(smoothElevationProfile(stairs, { windowMeters: 8 })).toEqual(stairs);
  });

  it('flattens grid steps more with a wider window', () => {
    const roughness = (samples: { elevation: number }[]) =>
      samples.slice(1).reduce((max, sample, index) => Math.max(max, Math.abs(sample.elevation - samples[index].elevation)), 0);
    const narrow = smoothElevationProfile(stairs, { windowMeters: 20 });
    const wide = smoothElevationProfile(stairs, { windowMeters: 90 });
    expect(roughness(wide)).toBeLessThan(roughness(narrow));
    expect(roughness(narrow)).toBeLessThanOrEqual(roughness(stairs));
  });
});
