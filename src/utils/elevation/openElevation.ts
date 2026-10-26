import { type ElevationPoint, type ElevationProvider, type ProviderResult } from './types';

const BATCH_SIZE = 100;
const RETRY_DELAYS_MS = [500, 1500];

const SOURCE = {
  id: 'open-elevation',
  label: 'Open-Elevation (SRTM)',
  resolutionMeters: 30,
  attribution: 'Open-Elevation, SRTM',
};

export const openElevationProvider: ElevationProvider = {
  id: SOURCE.id,
  async fetch(points): Promise<ProviderResult> {
    const elevations: (number | null)[] = [];
    // Sequential batches: the public server rejects bursts of parallel requests.
    for (let start = 0; start < points.length; start += BATCH_SIZE) {
      const batch = points.slice(start, start + BATCH_SIZE);
      elevations.push(...await fetchBatchWithRetry(batch));
    }
    return { elevations, source: SOURCE };
  },
};

async function fetchBatchWithRetry(batch: ElevationPoint[]): Promise<(number | null)[]> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchBatch(batch);
    } catch (err) {
      if (attempt === RETRY_DELAYS_MS.length) {
        console.warn('Open-Elevation request failed', err);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  return batch.map(() => null);
}

async function fetchBatch(batch: ElevationPoint[]): Promise<(number | null)[]> {
  const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      locations: batch.map((loc) => ({ latitude: loc.lat, longitude: loc.lng })),
    }),
  });

  if (!response.ok) throw new Error(`Elevation API error: ${response.statusText}`);

  const data = (await response.json()) as { results?: { elevation?: number }[] };
  if (!data.results || data.results.length !== batch.length) throw new Error('Unexpected Open-Elevation response');
  return data.results.map((result) => (Number.isFinite(result.elevation) ? result.elevation! : null));
}
