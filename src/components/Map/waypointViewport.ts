/**
 * Only a route that appears at once (initial render or shared link) is focused.
 * Waypoints added or removed one by one come from the user, who already controls the view.
 */
export function shouldAutoFocusWaypoints(previousCount: number | null, nextCount: number): boolean {
  if (nextCount === 0) return false;
  return previousCount === null || previousCount === 0;
}
