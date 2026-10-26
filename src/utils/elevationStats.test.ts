import { describe, expect, it } from 'vitest';
import { elevationStats, valueAtDistance } from './elevationStats';

const profile = (elevations: number[], spacing = 5) => elevations.map((elevation, index) => ({ distance: index * spacing, elevation }));

describe('elevationStats', () => {
  it('returns null for an empty profile', () => {
    expect(elevationStats([])).toBeNull();
  });

  it('reports a flat route as flat', () => {
    const stats = elevationStats(profile([100, 100, 100, 100, 100, 100]));
    expect(stats).toMatchObject({ ascent: 0, descent: 0, min: 100, max: 100, netChange: 0, maxUphillPercent: 0, maxDownhillPercent: 0 });
  });

  it('sums a climb and the following descent separately', () => {
    const stats = elevationStats(profile([100, 105, 110, 115, 110, 104]))!;
    expect(stats.ascent).toBeCloseTo(15);
    expect(stats.descent).toBeCloseTo(11);
    expect(stats.netChange).toBeCloseTo(4);
    expect(stats.max).toBe(115);
    expect(stats.min).toBe(100);
  });

  it('ignores noise below the threshold but keeps ascent − descent equal to the net change', () => {
    const noisy = profile(Array.from({ length: 200 }, (_, index) => 100 + (index % 2 === 0 ? 0 : 0.2) + index * 0.01));
    const stats = elevationStats(noisy)!;
    expect(stats.ascent).toBeLessThan(3);
    expect(stats.ascent - stats.descent).toBeCloseTo(stats.netChange, 6);
  });

  it('measures the steepest gradient over at least 20 m', () => {
    // 2 m up within 20 m = 10 %, and a single 5 m spike would read 40 % if it weren't windowed.
    const stats = elevationStats(profile([100, 100, 100, 102, 102, 102, 102, 100, 100, 100]))!;
    expect(stats.maxUphillPercent).toBeCloseTo(10);
    expect(stats.maxDownhillPercent).toBeCloseTo(10);
  });
});

describe('valueAtDistance', () => {
  const samples = profile([100, 110, 130], 100);

  it('interpolates between samples and clamps at the ends', () => {
    expect(valueAtDistance(samples, 50, (sample) => sample.elevation)).toBe(105);
    expect(valueAtDistance(samples, -10, (sample) => sample.elevation)).toBe(100);
    expect(valueAtDistance(samples, 999, (sample) => sample.elevation)).toBe(130);
  });

  it('returns null without samples', () => {
    expect(valueAtDistance([], 10, (sample: { distance: number }) => sample.distance)).toBeNull();
  });
});
