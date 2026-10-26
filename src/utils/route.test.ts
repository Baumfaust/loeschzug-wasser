import { describe, expect, it } from 'vitest';
import { sampleSegment, sampleStraightLine } from './route';

describe('route utilities', () => {
  it('samples both endpoints of a straight route', () => {
    const samples = sampleStraightLine({ lat: 51, lng: 7 }, { lat: 51.001, lng: 7.001 }, 10);
    expect(samples[0]).toMatchObject({ lat: 51, lng: 7, distance: 0 });
    expect(samples.at(-1)).toMatchObject({ lat: 51.001, lng: 7.001 });
    expect(samples.length).toBeGreaterThan(1);
  });
});

describe('sampleSegment', () => {
  it('samples along the stored route geometry using the routed distance', () => {
    const { distance, samples } = sampleSegment(
      { lat: 51, lng: 7 },
      { lat: 51.001, lng: 7.002, routeDistance: 300, routePath: [[51, 7], [51.001, 7], [51.001, 7.002]] },
    );
    expect(distance).toBe(300);
    expect(samples[0]).toMatchObject({ distance: 0, lat: 51, lng: 7 });
    expect(samples.at(-1)).toMatchObject({ distance: 300, lat: 51.001, lng: 7.002 });
  });

  it('falls back to a straight line without geometry', () => {
    const { samples } = sampleSegment({ lat: 51, lng: 7 }, { lat: 51.001, lng: 7.001 });
    expect(samples.at(-1)).toMatchObject({ lat: 51.001, lng: 7.001 });
  });
});
