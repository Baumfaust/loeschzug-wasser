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
    // Open-Elevation API accepts POST with JSON payload
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

    const data = await response.json();
    if (data && data.results) {
      return data.results.map((res: { elevation: number }) => res.elevation);
    }
  } catch (err) {
    console.warn('Failed to fetch elevation from Open-Elevation API, falling back to 0m', err);
  }

  // Fallback to 0m if API fails
  return locations.map(() => 0);
}
