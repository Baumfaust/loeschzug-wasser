import { describe, expect, it } from 'vitest';
import { sampleStraightLine } from './route';

describe('route utilities', () => {
  it('samples both endpoints of a straight route', () => {
    const samples = sampleStraightLine({ lat: 51, lng: 7 }, { lat: 51.001, lng: 7.001 }, 10);
    expect(samples[0]).toMatchObject({ lat: 51, lng: 7, distance: 0 });
    expect(samples.at(-1)).toMatchObject({ lat: 51.001, lng: 7.001 });
    expect(samples.length).toBeGreaterThan(1);
  });
});
