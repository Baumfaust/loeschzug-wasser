import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWaterStore } from '../../store/useWaterStore';
import { type CalculationResult, type Hydrant, type RouteSample } from '../../types/water';
import { fetchElevationForCoordinates } from '../../utils/elevation';
import { geocodeLocation } from '../../utils/geocode';
import { ELEVATION_SAMPLE_INTERVAL_METERS, routeBetweenPoints, sampleStraightLine } from '../../utils/route';
import { calculateDistance } from '../../utils/elevation';
import { findNearbyHydrants } from '../../utils/osm';
import { shouldAutoFocusWaypoints } from './waypointViewport';

const debugConfigModules = import.meta.glob('../../debug-config.local.ts', {
  eager: true,
  import: 'debugConfig',
}) as Record<string, { enabled?: boolean; defaultLocationQuery?: string }>;

const debugConfig = Object.values(debugConfigModules)[0];

const startIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #22c55e; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 3px 5px rgba(0,0,0,0.3);">S</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const endIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 3px 5px rgba(0,0,0,0.3);">E</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const waypointIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 9px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">•</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const pumpIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; border: 2px solid white; box-shadow: 0 3px 5px rgba(0,0,0,0.3);">⚡</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const hydrantIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #dc2626; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">H</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface MapViewProps {
  result: CalculationResult;
  hoveredDistance: number | null;
  onHoverDistance: (distance: number | null) => void;
}

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      const target = e.originalEvent.target;
      if (target instanceof HTMLElement && (target.closest('.leaflet-popup') || target.closest('.leaflet-marker-icon'))) return;

      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const DebugLocationInitializer: React.FC = () => {
  const map = useMapEvents({});

  React.useEffect(() => {
    if (!debugConfig?.enabled || !debugConfig.defaultLocationQuery) return;

    let cancelled = false;
    void geocodeLocation(debugConfig.defaultLocationQuery).then((location) => {
      if (!cancelled && location) {
        map.setView([location.lat, location.lng], 13);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [map]);

  return null;
};

const WaypointViewController: React.FC<{ waypoints: { lat: number; lng: number }[] }> = ({ waypoints }) => {
  const map = useMap();
  const previousWaypointCountRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (waypoints.length === 0) {
      previousWaypointCountRef.current = 0;
      return;
    }

    const shouldFocus = shouldAutoFocusWaypoints(previousWaypointCountRef.current, waypoints.length);
    previousWaypointCountRef.current = waypoints.length;

    if (!shouldFocus) return;

    if (waypoints.length === 1) {
      map.setView([waypoints[0].lat, waypoints[0].lng], 13);
      return;
    }

    map.fitBounds(
      waypoints.map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number]),
      { padding: [40, 40], maxZoom: 15 },
    );
  }, [map, waypoints]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ result, hoveredDistance, onHoverDistance }) => {
  const { waypoints, addWaypoint, updateWaypointElevation, updateWaypointRoute, removeWaypoint, setPumpPosition, setPumpProfileForPump, pumpConfig, pumpProfiles, followRoads, showHydrants } = useWaterStore();
  const [hydrants, setHydrants] = React.useState<Hydrant[]>([]);
  const waypointKey = waypoints.map((waypoint) => `${waypoint.lat},${waypoint.lng}`).join('|');
  const visibleHydrants = showHydrants && waypoints.length > 0 ? hydrants : [];

  React.useEffect(() => {
    if (!showHydrants || waypoints.length === 0) return;

    let cancelled = false;
    void findNearbyHydrants(waypoints).then((nearbyHydrants) => {
      if (!cancelled) setHydrants(nearbyHydrants);
    });

    return () => {
      cancelled = true;
    };
  }, [showHydrants, waypointKey, waypoints]);

  const handleMapClick = async (lat: number, lng: number) => {
    const previousWaypoint = useWaterStore.getState().waypoints.slice(-1)[0];
    const shouldFollowRoads = followRoads;
    const route = shouldFollowRoads && previousWaypoint
      ? await routeBetweenPoints(previousWaypoint, { lat, lng })
      : null;
    const straightDistance = previousWaypoint ? calculateDistance(previousWaypoint.lat, previousWaypoint.lng, lat, lng) : 0;
    const samples = previousWaypoint
      ? route?.samples ?? sampleStraightLine(previousWaypoint, { lat, lng }, ELEVATION_SAMPLE_INTERVAL_METERS)
      : undefined;

    addWaypoint(lat, lng, 0, {
      followsRoads: shouldFollowRoads,
      routeDistance: route?.distance,
      routePath: route?.path,
      routeSamples: samples?.map((sample) => ({ ...sample, elevation: 0 })),
    });

    const latestId = useWaterStore.getState().waypoints.slice(-1)[0]?.id;
    if (!latestId) return;

    const locations = samples ?? [{ distance: 0, lat, lng }];
    const elevations = (await Promise.all(
      chunk(locations, 100).map((batch) => fetchElevationForCoordinates(batch)),
    )).flat();
    if (elevations.length === 0) return;

    if (samples) {
      const routeSamples: RouteSample[] = samples.map((sample, index) => ({
        ...sample,
        elevation: elevations[index] ?? 0,
      }));
      updateWaypointRoute(latestId, {
        routeDistance: route?.distance ?? straightDistance,
        routePath: route?.path ?? [[previousWaypoint!.lat, previousWaypoint!.lng], [lat, lng]],
        routeSamples,
      });
      updateWaypointElevation(latestId, elevations[elevations.length - 1] ?? 0);
    } else {
      updateWaypointElevation(latestId, elevations[0]);
    }
  };

  const center: [number, number] = waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [51.1657, 10.4515];

  return (
    <div className="relative flex-1 h-full w-full">
      <MapContainer center={center} zoom={waypoints.length > 0 ? 13 : 6} style={{ width: '100%', height: '100%' }} className="z-0">
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <DebugLocationInitializer />
        <WaypointViewController waypoints={waypoints} />
        <MapClickHandler onMapClick={handleMapClick} />

        {waypoints.slice(1).map((waypoint, index) => {
          const start = waypoints[index];
          const positions = waypoint.routePath ?? [
            [start.lat, start.lng],
            [waypoint.lat, waypoint.lng],
          ];
          const segmentDistance = result.segmentDetails[index]?.distance ?? waypoint.routeDistance ?? calculateDistance(start.lat, start.lng, waypoint.lat, waypoint.lng);
          const segmentStart = (result.segmentDetails[index]?.accumulatedDistance ?? segmentDistance) - segmentDistance;
          const isHovered = hoveredDistance !== null && hoveredDistance >= segmentStart && hoveredDistance <= segmentStart + segmentDistance;

          return (
            <Polyline
              key={`segment-${waypoint.id}`}
              positions={positions}
              pathOptions={{ color: isHovered ? '#facc15' : '#0ea5e9', weight: isHovered ? 7 : 4, opacity: 0.9 }}
              eventHandlers={{
                mouseover: () => onHoverDistance(segmentStart + segmentDistance / 2),
                mouseout: () => onHoverDistance(null),
              }}
            />
          );
        })}

        {hoveredDistance !== null && (() => {
          const point = getCoord(waypoints, hoveredDistance);
          return point ? <CircleMarker center={[point.lat, point.lng]} radius={8} pathOptions={{ color: '#facc15', fillColor: '#facc15', fillOpacity: 0.9, weight: 3 }} /> : null;
        })()}

        {waypoints.map((wp, i) => {
          let icon = waypointIcon;
          if (i === 0) icon = startIcon;
          else if (i === waypoints.length - 1) icon = endIcon;

          return (
            <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={icon}>
              <Popup>
                <div className="text-slate-900 text-xs space-y-1 p-1">
                  <div className="font-bold">{i === 0 ? '🟢 Start' : i === waypoints.length - 1 ? '🔴 Ziel' : `📍 Punkt #${i + 1}`}</div>
                  <div>Höhe: {Math.round(wp.elevation)}m</div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      removeWaypoint(wp.id);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    className="w-full bg-rose-500 text-white rounded py-1 px-2 font-medium"
                  >Löschen</button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {visibleHydrants.map((hydrant) => {
          const hydratedInfo = getHydrantInfo(hydrant);
          return (
            <Marker key={`hydrant-${hydrant.id}`} position={[hydrant.lat, hydrant.lng]} icon={hydrantIcon}>
              <Popup>
                <div className="min-w-36 space-y-1 p-1 text-[11px] text-slate-900">
                  <div className="font-bold text-red-600">🚒 Hydrant</div>
                  <div>Entfernung: {Math.round(hydrant.distanceToWaypoint)} m</div>
                  {hydratedInfo.map((info) => (
                    <div key={info.label}>
                      <span className="font-medium text-slate-700">{info.label}:</span> {info.value}
                    </div>
                  ))}
                  {hydrant.id && (
                    <a
                      href={`https://www.openstreetmap.org/node/${hydrant.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-cyan-700 underline"
                    >
                      OpenStreetMap öffnen
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {result.pumpStations.map((pump) => {
          const coord = getCoord(waypoints, pump.distance);
          if (!coord) return null;
          return (
            <Marker
              key={`pump-${pump.pumpIndex}`}
              position={[coord.lat, coord.lng]}
              icon={pumpIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target as L.Marker;
                  const snapped = nearestDistanceOnRoute(waypoints, marker.getLatLng().lat, marker.getLatLng().lng);
                  if (snapped !== null) setPumpPosition(pump.pumpIndex, snapped);
                },
              }}
            >
              <Popup>
                <div className="text-slate-900 text-xs space-y-1 p-1">
                  <div className="font-bold text-amber-600">⚡ Relaispumpe #{pump.pumpIndex}</div>
                  <div>Distanz: {Math.round(pump.distance)} m | Höhe: {Math.round(pump.elevation)} m</div>
                  <label className="block font-medium">Pumpenmodell
                    <select
                      value={pumpProfiles[pump.pumpIndex] ?? pumpConfig.profile}
                      onChange={(event) => setPumpProfileForPump(pump.pumpIndex, event.target.value as import('../../types/water').PumpProfileType)}
                      onMouseDown={(event) => event.stopPropagation()}
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-1 py-1"
                    >
                      <option value="pfpn-10-1000">PFPN 10-1000 (10 bar / 1.000 l/min)</option>
                      <option value="ts-8-8">TS 8/8 (8 bar / 800 l/min)</option>
                      <option value="custom">Benutzerdefiniert</option>
                    </select>
                  </label>
                  <div className="text-slate-500">Ziehen, um die Pumpe auf der Strecke zu verschieben.</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function getHydrantInfo(hydrant: Hydrant): { label: string; value: string }[] {
  const entries: Array<{ label: string; value: string }> = [];
  const diameter = hydrant.tags?.['fire_hydrant:diameter'] ?? hydrant.tags?.diameter;
  const type = hydrant.tags?.['fire_hydrant:type'];
  const position = hydrant.tags?.['fire_hydrant:position'];

  if (diameter) entries.push({ label: 'Rohrdurchmesser', value: diameter });
  if (type) entries.push({ label: 'Bauart', value: type });
  if (position) entries.push({ label: 'Position', value: translateHydrantPosition(position) });

  return entries;
}

function translateHydrantPosition(value: string): string {
  const translations: Record<string, string> = {
    lane: 'Fahrbahn',
    sidewalk: 'Gehweg',
    parking_lot: 'Parkplatz',
    yard: 'Hof',
    ground: 'Boden',
    kerbside: 'Bordstein',
  };
  return translations[value.toLowerCase()] ?? value;
}

function getCoord(waypoints: { lat: number; lng: number; routeDistance?: number; routePath?: [number, number][] }[], target: number) {
  if (waypoints.length < 2) return null;
  let accumulated = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const path = end.routePath ?? [[start.lat, start.lng], [end.lat, end.lng]];
    const distance = end.routeDistance ?? pathDistance(path);
    if (target <= accumulated + distance) {
      return pointOnPath(path, Math.max(0, target - accumulated));
    }
    accumulated += distance;
  }
  const last = waypoints[waypoints.length - 1];
  return { lat: last.lat, lng: last.lng };
}

function nearestDistanceOnRoute(waypoints: { lat: number; lng: number; routeDistance?: number; routePath?: [number, number][] }[], lat: number, lng: number): number | null {
  if (waypoints.length < 2) return null;
  let accumulated = 0;
  let bestDistance = Infinity;
  let bestRouteDistance = 0;
  for (let index = 0; index < waypoints.length - 1; index++) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const path = end.routePath ?? [[start.lat, start.lng], [end.lat, end.lng]];
    const segmentDistance = end.routeDistance ?? pathDistance(path);
    let pathDistanceSoFar = 0;
    for (let pointIndex = 1; pointIndex < path.length; pointIndex++) {
      const a = path[pointIndex - 1];
      const b = path[pointIndex];
      const dx = b[1] - a[1];
      const dy = b[0] - a[0];
      const denominator = dx * dx + dy * dy;
      const ratio = denominator > 0 ? Math.max(0, Math.min(1, ((lng - a[1]) * dx + (lat - a[0]) * dy) / denominator)) : 0;
      const closestLat = a[0] + (b[0] - a[0]) * ratio;
      const closestLng = a[1] + (b[1] - a[1]) * ratio;
      const distanceToPoint = hav(lat, lng, closestLat, closestLng);
      if (distanceToPoint < bestDistance) {
        bestDistance = distanceToPoint;
        bestRouteDistance = accumulated + (pathDistanceSoFar + hav(a[0], a[1], closestLat, closestLng)) * (segmentDistance / Math.max(pathDistance(path), 1));
      }
      pathDistanceSoFar += hav(a[0], a[1], b[0], b[1]);
    }
    accumulated += segmentDistance;
  }
  return bestRouteDistance;
}

function pathDistance(path: [number, number][]) {
  return path.slice(1).reduce((total, point, index) => total + hav(path[index][0], path[index][1], point[0], point[1]), 0);
}

function pointOnPath(path: [number, number][], target: number) {
  let accumulated = 0;
  for (let i = 1; i < path.length; i++) {
    const start = path[i - 1], end = path[i];
    const distance = hav(start[0], start[1], end[0], end[1]);
    if (target <= accumulated + distance) {
      const ratio = distance > 0 ? (target - accumulated) / distance : 0;
      return { lat: start[0] + (end[0] - start[0]) * ratio, lng: start[1] + (end[1] - start[1]) * ratio };
    }
    accumulated += distance;
  }
  const last = path[path.length - 1];
  return { lat: last[0], lng: last[1] };
}

function hav(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3, φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
