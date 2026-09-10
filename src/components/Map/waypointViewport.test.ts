import { describe, expect, it } from 'vitest';
import { shouldAutoFocusWaypoints } from './waypointViewport';

describe('waypointViewport', () => {
  it('auto-focuses when the route first becomes non-empty', () => {
    expect(shouldAutoFocusWaypoints(null, 1)).toBe(true);
    expect(shouldAutoFocusWaypoints(0, 2)).toBe(true);
  });

  it('does not re-fit the map while more waypoints are added to an existing route', () => {
    expect(shouldAutoFocusWaypoints(2, 3)).toBe(false);
    expect(shouldAutoFocusWaypoints(3, 5)).toBe(false);
  });

  it('auto-focuses again when the route collapses back to a single point', () => {
    expect(shouldAutoFocusWaypoints(2, 1)).toBe(true);
  });
});
