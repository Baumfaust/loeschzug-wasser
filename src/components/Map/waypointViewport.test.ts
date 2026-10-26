import { describe, expect, it } from 'vitest';
import { shouldAutoFocusWaypoints } from './waypointViewport';

describe('waypointViewport', () => {
  it('auto-focuses when the route first becomes non-empty', () => {
    expect(shouldAutoFocusWaypoints(null, 1)).toBe(true);
    expect(shouldAutoFocusWaypoints(0, 1)).toBe(true);
    expect(shouldAutoFocusWaypoints(0, 2)).toBe(true);
  });

  it('does not move the map while waypoints are added one by one', () => {
    expect(shouldAutoFocusWaypoints(1, 2)).toBe(false);
    expect(shouldAutoFocusWaypoints(2, 3)).toBe(false);
    expect(shouldAutoFocusWaypoints(3, 5)).toBe(false);
  });

  it('does not move the map when waypoints are removed', () => {
    expect(shouldAutoFocusWaypoints(2, 1)).toBe(false);
    expect(shouldAutoFocusWaypoints(1, 0)).toBe(false);
  });
});
