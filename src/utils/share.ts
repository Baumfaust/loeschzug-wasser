import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { type HoseConfig, type PumpConfig, type Waypoint } from '../types/water';

const SHARE_PARAM = 'config';

export interface ShareState {
  waypoints: Waypoint[];
  hoseConfig: HoseConfig;
  pumpConfig: PumpConfig;
  followRoads: boolean;
  showHydrants: boolean;
}

export function createShareUrl(state: ShareState, compact = false): string {
  const url = new URL(window.location.href);
  url.search = '';
  const shareState = compact
    ? {
        ...state,
        waypoints: state.waypoints.map(({ routeDistance: _routeDistance, routePath: _routePath, routeSamples: _routeSamples, ...waypoint }) => waypoint),
      }
    : state;
  url.searchParams.set(SHARE_PARAM, compressToEncodedURIComponent(JSON.stringify(shareState)));
  return url.toString();
}

export function readShareState(): ShareState | null {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  if (!encoded) return null;

  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const value = JSON.parse(json) as Partial<ShareState>;
    if (!Array.isArray(value.waypoints) || !value.hoseConfig || !value.pumpConfig) return null;
    return {
      waypoints: value.waypoints,
      hoseConfig: value.hoseConfig,
      pumpConfig: value.pumpConfig,
      followRoads: value.followRoads ?? true,
      showHydrants: value.showHydrants ?? false,
    };
  } catch {
    return null;
  }
}
