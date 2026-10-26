import { type ElevationSourceInfo } from '../../types/water';
import { openElevationProvider } from './openElevation';
import { AWS_TERRARIUM, MAPTERHORN, createTileProvider } from './terrainTiles';
import { type ElevationPoint, type ElevationProvider, type ElevationResult, ElevationUnavailableError } from './types';

export { ElevationUnavailableError } from './types';
export type { ElevationPoint, ElevationProvider, ElevationResult } from './types';

// Haversine formula to calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// Highest quality first: Mapterhorn contains the official DGM1 (1 m laser scan) of Rheinland-Pfalz.
const defaultProviders: ElevationProvider[] = [
  createTileProvider(MAPTERHORN),
  createTileProvider(AWS_TERRARIUM),
  openElevationProvider,
];

/**
 * Fetches elevations for all points, asking the next provider only for points the previous one
 * could not answer. Throws instead of inventing values, so a failure never becomes a flat 0 m profile.
 */
export async function fetchElevationProfile(
  points: ElevationPoint[],
  providers: ElevationProvider[] = defaultProviders,
): Promise<ElevationResult> {
  const elevations: (number | null)[] = points.map(() => null);
  let source: ElevationSourceInfo | null = null;

  for (const provider of providers) {
    const missing = elevations.flatMap((value, index) => (value === null ? [index] : []));
    if (missing.length === 0) break;

    try {
      const result = await provider.fetch(missing.map((index) => points[index]));
      let answered = 0;
      result.elevations.forEach((value, position) => {
        if (value !== null && Number.isFinite(value)) {
          elevations[missing[position]] = value;
          answered++;
        }
      });
      // Report the coarsest source that contributed, since it limits the profile quality.
      if (answered > 0 && (!source || result.source.resolutionMeters > source.resolutionMeters)) source = result.source;
    } catch (err) {
      console.warn(`Elevation provider ${provider.id} failed`, err);
    }
  }

  const missingCount = elevations.filter((value) => value === null).length;
  if (missingCount > 0 || !source) throw new ElevationUnavailableError(missingCount);
  return { elevations: elevations as number[], source };
}
