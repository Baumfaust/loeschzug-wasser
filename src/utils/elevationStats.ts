export interface ProfilePoint {
  distance: number;
  elevation: number;
}

export interface ElevationStats {
  ascent: number;
  descent: number;
  min: number;
  max: number;
  netChange: number;
  // Steepest climb / descent in percent, measured over at least GRADIENT_WINDOW_METERS.
  maxUphillPercent: number;
  maxDownhillPercent: number;
}

// Changes below this are treated as noise when summing ascent and descent.
const ASCENT_THRESHOLD_METERS = 0.5;
export const GRADIENT_WINDOW_METERS = 20;

export function elevationStats(samples: ProfilePoint[]): ElevationStats | null {
  if (samples.length === 0) return null;

  let ascent = 0;
  let descent = 0;
  let reference = samples[0].elevation;
  let min = Infinity;
  let max = -Infinity;

  for (const { elevation } of samples) {
    min = Math.min(min, elevation);
    max = Math.max(max, elevation);
    if (elevation - reference >= ASCENT_THRESHOLD_METERS) {
      ascent += elevation - reference;
      reference = elevation;
    } else if (reference - elevation >= ASCENT_THRESHOLD_METERS) {
      descent += reference - elevation;
      reference = elevation;
    }
  }
  // Book the remainder below the threshold, so ascent − descent equals the net change exactly.
  const remainder = samples[samples.length - 1].elevation - reference;
  if (remainder > 0) ascent += remainder;
  else descent -= remainder;

  let maxUphillPercent = 0;
  let maxDownhillPercent = 0;
  let end = 0;
  for (let start = 0; start < samples.length; start++) {
    while (end < samples.length && samples[end].distance - samples[start].distance < GRADIENT_WINDOW_METERS) end++;
    if (end >= samples.length) break;
    const run = samples[end].distance - samples[start].distance;
    const percent = ((samples[end].elevation - samples[start].elevation) / run) * 100;
    maxUphillPercent = Math.max(maxUphillPercent, percent);
    maxDownhillPercent = Math.min(maxDownhillPercent, percent);
  }

  return {
    ascent,
    descent,
    min,
    max,
    netChange: samples[samples.length - 1].elevation - samples[0].elevation,
    maxUphillPercent,
    maxDownhillPercent: Math.abs(maxDownhillPercent),
  };
}

/** Linear interpolation of a value along the distance axis; samples must be sorted by distance. */
export function valueAtDistance<T extends { distance: number }>(samples: T[], distance: number, value: (sample: T) => number): number | null {
  if (samples.length === 0) return null;
  if (distance <= samples[0].distance) return value(samples[0]);
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (distance <= current.distance) {
      const span = current.distance - previous.distance;
      const ratio = span > 0 ? (distance - previous.distance) / span : 1;
      return value(previous) + (value(current) - value(previous)) * ratio;
    }
  }
  return value(samples[samples.length - 1]);
}
