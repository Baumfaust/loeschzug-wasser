import { describe, expect, it } from 'vitest';
import { decimateForWidth, formatDistance, formatNumber, niceScale } from './chartScale';

describe('niceScale', () => {
  it('covers the range with 1/2/5 steps', () => {
    expect(niceScale(88.3, 94.6, 4)).toMatchObject({ min: 88, max: 96, step: 2, ticks: [88, 90, 92, 94, 96] });
    expect(niceScale(0, 10.4, 3)).toMatchObject({ min: 0, max: 15, step: 5, ticks: [0, 5, 10, 15] });
    expect(niceScale(0, 2340, 4).step).toBe(1000);
  });

  it('handles a zero-width or reversed range', () => {
    const flat = niceScale(100, 100);
    expect(flat.min).toBeLessThan(100);
    expect(flat.max).toBeGreaterThan(100);
    expect(niceScale(10, 0).min).toBe(0);
  });

  it('avoids floating point noise in tick labels', () => {
    expect(niceScale(0, 0.7, 4).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });
});

describe('formatting', () => {
  it('formats distances in German notation', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1250)).toBe('1,3 km');
    expect(formatDistance(1250, 2)).toBe('1,25 km');
    expect(formatNumber(1.5, 1)).toBe('1,5');
  });
});

describe('decimateForWidth', () => {
  it('keeps short lines unchanged', () => {
    const points = [1, 2, 3];
    expect(decimateForWidth(points, 100, (point) => point, (point) => point)).toBe(points);
  });

  it('keeps peaks, troughs and both ends of a dense line', () => {
    const points = Array.from({ length: 1000 }, (_, index) => ({ x: index / 10, y: index === 503 ? 50 : index === 707 ? -50 : 0 }));
    const result = decimateForWidth(points, 100, (point) => point.x, (point) => point.y);
    expect(result.length).toBeLessThanOrEqual(201);
    expect(result).toContain(points[503]);
    expect(result).toContain(points[707]);
    expect(result[0]).toBe(points[0]);
    expect(result.at(-1)).toBe(points[999]);
  });
});
