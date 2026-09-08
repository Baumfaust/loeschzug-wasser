export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: 'jsonv2',
    limit: '1',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;

  const result = data[0];

  if (!result?.lat || !result?.lon) {
    return null;
  }

  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    label: result.display_name ?? normalizedQuery,
  };
}
