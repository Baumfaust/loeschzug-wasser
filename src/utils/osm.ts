import { calculateDistance } from './elevation';
import { type Hydrant } from '../types/water';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
export const HYDRANT_SEARCH_RADIUS_METERS = 200;

interface OverpassElement {
  type?: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

export async function findNearbyHydrants(
  waypoints: Array<{ lat: number; lng: number }>,
  radius = HYDRANT_SEARCH_RADIUS_METERS,
): Promise<Hydrant[]> {
  if (waypoints.length === 0) return [];

  const searches = waypoints
    .map(({ lat, lng }) => {
      const area = `(around:${radius},${lat},${lng})`;
      return `nwr${area}[amenity=fire_hydrant];nwr${area}[emergency=fire_hydrant];`;
    })
    .join('');
  const query = `[out:json][timeout:25];(${searches});out center tags;`;

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { elements?: OverpassElement[] };
    const hydrants = new Map<string, Hydrant>();

    for (const element of data.elements ?? []) {
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      if (lat === undefined || lng === undefined) continue;

      const distanceToWaypoint = Math.min(
        ...waypoints.map((waypoint) => calculateDistance(waypoint.lat, waypoint.lng, lat, lng)),
      );
      if (distanceToWaypoint <= radius) {
        hydrants.set(`${element.type ?? 'element'}-${element.id}`, {
          id: `${element.id}`,
          lat,
          lng,
          distanceToWaypoint,
          tags: element.tags,
        });
      }
    }

    return [...hydrants.values()].sort((a, b) => a.distanceToWaypoint - b.distanceToWaypoint);
  } catch (error) {
    console.warn('Failed to fetch nearby hydrants from OpenStreetMap', error);
    return [];
  }
}
