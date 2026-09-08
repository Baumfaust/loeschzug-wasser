import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWaterStore } from '../../store/useWaterStore';
import { type CalculationResult } from '../../types/water';
import { fetchElevationForCoordinates } from '../../utils/elevation';

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

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      const target = e.originalEvent.target;
      if (target instanceof HTMLElement && target.closest('.leaflet-popup')) return;

      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const MapView: React.FC<{ result: CalculationResult }> = ({ result }) => {
  const { waypoints, addWaypoint, updateWaypointElevation, removeWaypoint } = useWaterStore();

  const handleMapClick = async (lat: number, lng: number) => {
    addWaypoint(lat, lng, 0);
    const elevations = await fetchElevationForCoordinates([{ lat, lng }]);
    if (elevations.length > 0) {
      const latestId = useWaterStore.getState().waypoints.slice(-1)[0]?.id;
      if (latestId) updateWaypointElevation(latestId, elevations[0]);
    }
  };

  const coords = waypoints.map((w) => [w.lat, w.lng] as [number, number]);
  const center: [number, number] = waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [51.1657, 10.4515];

  return (
    <div className="relative flex-1 h-full w-full">
      <MapContainer center={center} zoom={waypoints.length > 0 ? 13 : 6} style={{ width: '100%', height: '100%' }} className="z-0">
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onMapClick={handleMapClick} />

        {coords.length > 1 && <Polyline positions={coords} pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.8 }} />}

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
                  <button onClick={() => removeWaypoint(wp.id)} className="w-full bg-rose-500 text-white rounded py-1 px-2 font-medium">Löschen</button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {result.pumpStations.map((pump) => {
          const coord = getCoord(waypoints, pump.distance);
          if (!coord) return null;
          return (
            <Marker key={`pump-${pump.pumpIndex}`} position={[coord.lat, coord.lng]} icon={pumpIcon}>
              <Popup>
                <div className="text-slate-900 text-xs space-y-1 p-1">
                  <div className="font-bold text-amber-600">⚡ Pumpe #{pump.pumpIndex}</div>
                  <div>Distanz: {Math.round(pump.distance)}m | Höhe: {Math.round(pump.elevation)}m</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

function getCoord(waypoints: { lat: number; lng: number }[], target: number) {
  if (waypoints.length < 2) return null;
  let acc = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i], p2 = waypoints[i + 1];
    const d = hav(p1.lat, p1.lng, p2.lat, p2.lng);
    if (acc + d >= target) {
      const r = d > 0 ? (target - acc) / d : 0;
      return { lat: p1.lat + (p2.lat - p1.lat) * r, lng: p1.lng + (p2.lng - p1.lng) * r };
    }
    acc += d;
  }
  const last = waypoints[waypoints.length - 1];
  return { lat: last.lat, lng: last.lng };
}

function hav(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3, φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
