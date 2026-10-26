import { useWaterStore } from '../store/useWaterStore';
import { type RouteSample } from '../types/water';
import { fetchElevationProfile } from './elevation';
import { sampleSegment } from './route';

/**
 * Loads the elevation profile of the segment that ends at the given waypoint
 * (or only the point itself for the start waypoint) and stores it.
 */
export async function loadSegmentElevation(waypointId: string): Promise<void> {
  const store = useWaterStore.getState();
  const index = store.waypoints.findIndex((waypoint) => waypoint.id === waypointId);
  if (index < 0) return;

  const waypoint = store.waypoints[index];
  const previous = store.waypoints[index - 1];
  const segment = previous ? sampleSegment(previous, waypoint) : null;
  const points = segment?.samples ?? [{ distance: 0, lat: waypoint.lat, lng: waypoint.lng }];

  store.setWaypointElevationData(waypointId, { elevationStatus: 'pending' });

  try {
    const { elevations, source } = await fetchElevationProfile(points);

    // Skip stale results when the route changed while loading.
    const current = useWaterStore.getState().waypoints;
    const currentIndex = current.findIndex((candidate) => candidate.id === waypointId);
    if (currentIndex < 0 || current[currentIndex - 1]?.id !== previous?.id) return;

    const routeSamples: RouteSample[] | undefined = segment?.samples.map((sample, sampleIndex) => ({
      ...sample,
      elevation: elevations[sampleIndex],
    }));
    useWaterStore.getState().setWaypointElevationData(waypointId, {
      elevationStatus: 'ok',
      elevation: elevations[elevations.length - 1],
      elevationSource: source,
      ...(segment ? { routeSamples, routeDistance: segment.distance } : {}),
    });
  } catch (err) {
    console.warn('Elevation profile unavailable', err);
    useWaterStore.getState().setWaypointElevationData(waypointId, { elevationStatus: 'error' });
  }
}

/** Reloads every waypoint whose profile is missing or failed (e.g. after opening a shared link). */
export async function loadMissingElevations(): Promise<void> {
  const { waypoints } = useWaterStore.getState();
  const targets = waypoints.filter((waypoint, index) =>
    waypoint.elevationStatus === 'error'
    || (index > 0 && !waypoint.routeSamples?.length)
    || (index === 0 && waypoint.elevationStatus !== 'ok' && !waypoint.manualElevationOverride),
  );
  for (const waypoint of targets) await loadSegmentElevation(waypoint.id);
}
