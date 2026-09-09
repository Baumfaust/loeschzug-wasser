import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { type HoseConfig, type PumpConfig, type Waypoint } from '../types/water';

const SHARE_PARAM = 'config';

export interface ShareState {
  waypoints: Waypoint[];
  hoseConfig: HoseConfig;
  pumpConfig: PumpConfig;
  followRoads: boolean;
  showHydrants: boolean;
  pumpPositions?: Record<number, number>;
}

export function createSharePayload(state: ShareState, compact = false): string {
  // QR codes omit dense elevation samples, but must retain the routed geometry.
  const shareState = compact
    ? {
        ...state,
        waypoints: state.waypoints.map(({ routeSamples: _routeSamples, routePath, ...waypoint }) => ({
           ...waypoint,
           ...(routePath ? { routePath: compactPath(routePath) } : {}),
         })),
      }
    : state;
  return compressToEncodedURIComponent(JSON.stringify(shareState));
}

function compactPath(path: [number, number][], maxPoints = 30): [number, number][] {
  if (path.length <= maxPoints) return path;
  const step = (path.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => path[Math.round(index * step)]);
}

export function parseSharePayload(encoded: string): ShareState | null {
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
      ...(value.pumpPositions ? { pumpPositions: value.pumpPositions } : {}),
    };
  } catch {
    return null;
  }
}

export function createShareUrl(state: ShareState, compact = false): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(SHARE_PARAM, createSharePayload(state, compact));
  return url.toString();
}

export function readShareState(): ShareState | null {
  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM);
  return encoded ? parseSharePayload(encoded) : null;
}
