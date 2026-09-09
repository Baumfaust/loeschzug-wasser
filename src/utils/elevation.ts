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

export async function fetchElevationForCoordinates(
  locations: { lat: number; lng: number }[]
): Promise<number[]> {
  if (locations.length === 0) return [];

  try {
    // EU-DEM 25m is the preferred European terrain dataset.
    const locationsQuery = locations.map((loc) => `${loc.lat},${loc.lng}`).join('|');
    const demResponse = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${encodeURIComponent(locationsQuery)}`);
    if (demResponse.ok) {
      const data = await demResponse.json() as { results?: Array<{ elevation?: number | null }> };
      const elevations = data.results?.map((result) => result.elevation);
      if (isCompleteElevationResult(elevations, locations.length)) return elevations;
    }

    // Open-Meteo is a reliable global fallback and accepts batched coordinates.
    const openMeteoUrl = new URL('https://api.open-meteo.com/v1/elevation');
    openMeteoUrl.searchParams.set('latitude', locations.map((loc) => loc.lat).join(','));
    openMeteoUrl.searchParams.set('longitude', locations.map((loc) => loc.lng).join(','));
    const openMeteoResponse = await fetch(openMeteoUrl);
    if (openMeteoResponse.ok) {
      const data = await openMeteoResponse.json() as { elevation?: Array<number | null> };
      if (isCompleteElevationResult(data.elevation, locations.length)) return data.elevation;
    }

    // Open-Elevation API accepts POST as a final fallback.
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        locations: locations.map((loc) => ({ latitude: loc.lat, longitude: loc.lng })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.statusText}`);
    }

    const data = await response.json() as { results?: Array<{ elevation?: number | null }> };
    const elevations = data.results?.map((result) => result.elevation);
    if (isCompleteElevationResult(elevations, locations.length)) return elevations;
  } catch (err) {
    console.warn('Failed to fetch elevation from EU-DEM/Open-Meteo/Open-Elevation', err);
  }

  // Do not replace missing terrain with zeroes: callers can retain their existing profile.
  return [];
}

function isCompleteElevationResult(values: Array<number | null | undefined> | undefined, expectedLength: number): values is number[] {
  return values?.length === expectedLength && values.every((value) => Number.isFinite(value));
}
