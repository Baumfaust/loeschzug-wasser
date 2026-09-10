export function shouldAutoFocusWaypoints(previousCount: number | null, nextCount: number): boolean {
  if (nextCount === 0) return false;
  if (previousCount === null) return true;
  if (previousCount === 0) return true;
  if (previousCount === 1 && nextCount > 1) return true;
  if (previousCount > 1 && nextCount === 1) return true;
  return false;
}
