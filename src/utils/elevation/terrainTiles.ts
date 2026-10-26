import { type ElevationSourceInfo } from '../../types/water';
import { type ElevationPoint, type ElevationProvider, type ProviderResult } from './types';

export interface TilePixels {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA
}

// Resolves null when the tile does not exist (e.g. 404 outside high-resolution coverage).
export type TileLoader = (url: string) => Promise<TilePixels | null>;

export interface TerrainTileset {
  id: string;
  label: string;
  url: (z: number, x: number, y: number) => string;
  tileSize: number;
  // Tried from highest to lowest; a missing tile falls back to the next zoom level.
  zooms: number[];
  // Resolution of the underlying data when it is coarser than the tile pixels (e.g. SRTM).
  nominalResolutionMeters?: number;
  attribution: string;
  describe?: (points: ElevationPoint[], zoom: number, resolutionMeters: number) => Partial<ElevationSourceInfo>;
}

const EARTH_CIRCUMFERENCE = 40075016.686;

// Approximate state border of Rheinland-Pfalz, enough to label the data source.
const RLP_BORDER: [number, number][] = [
  [6.42, 50.32], [6.77, 50.41], [7.02, 50.53], [7.21, 50.63], [7.53, 50.71], [7.74, 50.66],
  [7.98, 50.60], [8.12, 50.49], [8.13, 50.29], [7.96, 50.17], [8.06, 50.05], [8.27, 50.04],
  [8.29, 49.99], [8.35, 49.89], [8.48, 49.68], [8.36, 49.44], [8.48, 49.29], [8.22, 48.97], [7.94, 49.05],
  [7.64, 49.05], [7.44, 49.18], [7.33, 49.12], [7.19, 49.27], [7.29, 49.43], [7.02, 49.45],
  [6.84, 49.53], [6.59, 49.36], [6.37, 49.47], [6.42, 49.68], [6.51, 49.81], [6.14, 50.13],
  [6.40, 50.33],
];

export const MAPTERHORN: TerrainTileset = {
  id: 'mapterhorn',
  label: 'Mapterhorn-Geländekacheln',
  url: (z, x, y) => `https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`,
  tileSize: 512,
  zooms: [16, 15, 14, 13, 12],
  attribution: '© Mapterhorn (mapterhorn.com/attribution)',
  describe: (points, zoom) => (zoom === 16 && points.every((point) => isInsideRlp(point))
    ? {
        label: 'DGM1 Rheinland-Pfalz (Laserscan)',
        resolutionMeters: 1,
        attribution: '©GeoBasis-DE / LVermGeoRP 2025, dl-de/by-2-0, via Mapterhorn',
      }
    : {}),
};

export const AWS_TERRARIUM: TerrainTileset = {
  id: 'aws-terrarium',
  label: 'AWS Terrain Tiles (SRTM)',
  url: (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
  tileSize: 256,
  zooms: [15, 13],
  nominalResolutionMeters: 30,
  attribution: '© Mapzen, AWS Terrain Tiles',
};

export function decodeTerrarium(red: number, green: number, blue: number): number {
  return red * 256 + green + blue / 256 - 32768;
}

export function isInsideRlp(point: ElevationPoint): boolean {
  let inside = false;
  for (let index = 0, previous = RLP_BORDER.length - 1; index < RLP_BORDER.length; previous = index++) {
    const [lngA, latA] = RLP_BORDER[index];
    const [lngB, latB] = RLP_BORDER[previous];
    if ((latA > point.lat) !== (latB > point.lat)
      && point.lng < ((lngB - lngA) * (point.lat - latA)) / (latB - latA) + lngA) {
      inside = !inside;
    }
  }
  return inside;
}

/** Continuous pixel coordinate in the global Web-Mercator pixel grid, relative to pixel centres. */
export function globalPixel(point: ElevationPoint, zoom: number, tileSize: number): { x: number; y: number } {
  const scale = tileSize * 2 ** zoom;
  const latRad = (point.lat * Math.PI) / 180;
  return {
    x: ((point.lng + 180) / 360) * scale - 0.5,
    y: ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * scale - 0.5,
  };
}

export function metersPerPixel(lat: number, zoom: number, tileSize: number): number {
  return (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) / (tileSize * 2 ** zoom);
}

export function bilinear(topLeft: number, topRight: number, bottomLeft: number, bottomRight: number, fx: number, fy: number): number {
  const top = topLeft + (topRight - topLeft) * fx;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
  return top + (bottom - top) * fy;
}

const MAX_CACHED_TILES = 48;

export function createTileProvider(tileset: TerrainTileset, loadTile: TileLoader = loadTileInBrowser): ElevationProvider {
  const cache = new Map<string, Promise<TilePixels | null>>();

  const getTile = (z: number, x: number, y: number) => {
    const key = `${z}/${x}/${y}`;
    let tile = cache.get(key);
    if (!tile) {
      tile = loadTile(tileset.url(z, x, y));
      // Failed requests are not cached, so a later retry can succeed.
      tile.catch(() => cache.delete(key));
      cache.set(key, tile);
      if (cache.size > MAX_CACHED_TILES) cache.delete(cache.keys().next().value!);
    }
    return tile;
  };

  const pixelAt = async (z: number, px: number, py: number): Promise<number | null> => {
    const tileCount = 2 ** z;
    const tileX = Math.floor(px / tileset.tileSize);
    const tileY = Math.floor(py / tileset.tileSize);
    if (tileY < 0 || tileY >= tileCount) return null;
    const tile = await getTile(z, ((tileX % tileCount) + tileCount) % tileCount, tileY);
    if (!tile) return null;
    const localX = px - tileX * tileset.tileSize;
    const localY = py - tileY * tileset.tileSize;
    const offset = (localY * tile.width + localX) * 4;
    return decodeTerrarium(tile.data[offset], tile.data[offset + 1], tile.data[offset + 2]);
  };

  const sample = async (point: ElevationPoint): Promise<{ elevation: number; zoom: number } | null> => {
    for (const zoom of tileset.zooms) {
      const { x, y } = globalPixel(point, zoom, tileset.tileSize);
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const [topLeft, topRight, bottomLeft, bottomRight] = await Promise.all([
        pixelAt(zoom, x0, y0),
        pixelAt(zoom, x0 + 1, y0),
        pixelAt(zoom, x0, y0 + 1),
        pixelAt(zoom, x0 + 1, y0 + 1),
      ]);
      if (topLeft === null) continue;
      // Neighbours on a missing adjacent tile fall back to the nearest known pixel.
      return {
        elevation: bilinear(topLeft, topRight ?? topLeft, bottomLeft ?? topLeft, bottomRight ?? topRight ?? topLeft, x - x0, y - y0),
        zoom,
      };
    }
    return null;
  };

  return {
    id: tileset.id,
    async fetch(points): Promise<ProviderResult> {
      const samples = await Promise.all(points.map((point) => sample(point).catch(() => null)));
      const usedZooms = samples.filter((value) => value !== null).map((value) => value.zoom);
      const coarsestZoom = usedZooms.length > 0 ? Math.min(...usedZooms) : tileset.zooms[0];
      const meanLat = points.reduce((sum, point) => sum + point.lat, 0) / Math.max(points.length, 1);
      const resolutionMeters = Math.max(metersPerPixel(meanLat, coarsestZoom, tileset.tileSize), tileset.nominalResolutionMeters ?? 0);
      return {
        elevations: samples.map((value) => value?.elevation ?? null),
        source: {
          id: tileset.id,
          label: tileset.label,
          resolutionMeters,
          attribution: tileset.attribution,
          ...tileset.describe?.(points, coarsestZoom, resolutionMeters),
        },
      };
    },
  };
}

async function loadTileInBrowser(url: string): Promise<TilePixels | null> {
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);

  // Disable colour management so the encoded RGB values stay untouched.
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  try {
    const { data, width, height } = readPixels(bitmap);
    return { data, width, height };
  } finally {
    bitmap.close();
  }
}

function readPixels(bitmap: ImageBitmap): ImageData {
  if (typeof OffscreenCanvas !== 'undefined') {
    const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}
