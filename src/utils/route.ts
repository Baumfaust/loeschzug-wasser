import { calculateDistance } from './elevation';

export interface RouteSamplePoint {
  distance: number;
  lat: number;
  lng: number;
}

export interface RouteResult {
  distance: number;
  path: [number, number][];
  samples: RouteSamplePoint[];
}

export const ELEVATION_SAMPLE_INTERVAL_METERS = 5;

export function sampleStraightLine(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  interval = ELEVATION_SAMPLE_INTERVAL_METERS,
): RouteSamplePoint[] {
  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  const targets = sampleDistances(distance, interval);

  return targets.map((target) => {
    const ratio = distance > 0 ? target / distance : 0;
    return {
      distance: target,
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    };
  });
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

  const path = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);

  return {
    distance: route.distance,
    path,
    samples: samplePath(path, route.distance, ELEVATION_SAMPLE_INTERVAL_METERS),
  };
}

function samplePath(path: [number, number][], routeDistance: number, interval: number): RouteSamplePoint[] {
  if (path.length < 2) return path.map(([lat, lng]) => ({ distance: 0, lat, lng }));

  const lengths = path.slice(1).map((point, index) => calculateDistance(path[index][0], path[index][1], point[0], point[1]));
  const geometryDistance = lengths.reduce((sum, length) => sum + length, 0);
  const targets = sampleDistances(routeDistance, interval);

  return targets.map((target) => {
    const geometryTarget = routeDistance > 0 ? (target / routeDistance) * geometryDistance : 0;
    let accumulated = 0;
    for (let index = 1; index < path.length; index++) {
      const length = lengths[index - 1];
      if (geometryTarget <= accumulated + length) {
        const ratio = length > 0 ? (geometryTarget - accumulated) / length : 0;
        return {
          distance: target,
          lat: path[index - 1][0] + (path[index][0] - path[index - 1][0]) * ratio,
          lng: path[index - 1][1] + (path[index][1] - path[index - 1][1]) * ratio,
        };
      }
      accumulated += length;
    }
    const last = path[path.length - 1];
    return { distance: target, lat: last[0], lng: last[1] };
  });
}

function sampleDistances(distance: number, interval: number): number[] {
  if (distance <= 0) return [0];

  const targets: number[] = [];
  for (let target = 0; target < distance; target += interval) {
    targets.push(target);
  }
  targets.push(distance);
  return targets;
}