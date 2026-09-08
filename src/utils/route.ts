export interface RouteResult {
  distance: number;
  path: [number, number][];
}

export async function routeBetweenPoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): Promise<RouteResult | null> {
  const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const data = (await response.json()) as {
    code?: string;
    routes?: Array<{
      distance?: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  const route = data.routes?.[0];

  if (data.code !== 'Ok' || !route?.distance || !route.geometry?.coordinates?.length) {
    return null;
  }

  return {
    distance: route.distance,
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}
