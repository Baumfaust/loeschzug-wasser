import { describe, expect, it } from 'vitest';
import { ElevationUnavailableError, fetchElevationProfile, type ElevationProvider } from './index';
import { MAPTERHORN, bilinear, createTileProvider, decodeTerrarium, globalPixel, isInsideRlp, metersPerPixel, type TerrainTileset, type TilePixels } from './terrainTiles';

const source = (id: string, resolutionMeters: number) => ({ id, label: id, resolutionMeters });

function encodeTerrarium(elevation: number): [number, number, number] {
  const value = elevation + 32768;
  const red = Math.floor(value / 256);
  const green = Math.floor(value - red * 256);
  const blue = Math.round((value - red * 256 - green) * 256);
  return [red, green, blue];
}

// A tile whose elevation rises by 1 m per pixel to the east.
function rampTile(size: number, base: number): TilePixels {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [red, green, blue] = encodeTerrarium(base + x);
      data.set([red, green, blue, 255], (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

describe('terrain tile decoding', () => {
  it('decodes Terrarium RGB values to metres', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0);
    expect(decodeTerrarium(128, 65, 0)).toBe(65);
    expect(decodeTerrarium(...encodeTerrarium(174.06))).toBeCloseTo(174.06, 2);
  });

  it('interpolates bilinearly between pixel centres', () => {
    expect(bilinear(0, 10, 20, 30, 0.5, 0.5)).toBe(15);
    expect(bilinear(0, 10, 20, 30, 0, 0)).toBe(0);
    expect(bilinear(0, 10, 20, 30, 1, 1)).toBe(30);
  });

  it('computes pixel coordinates and resolution in Web Mercator', () => {
    expect(globalPixel({ lat: 0, lng: 0 }, 0, 256)).toEqual({ x: 127.5, y: 127.5 });
    expect(metersPerPixel(50.36, 16, 512)).toBeCloseTo(0.76, 2);
  });

  it('recognises points inside Rheinland-Pfalz', () => {
    expect(isInsideRlp({ lat: 50.3647, lng: 7.6061 })).toBe(true); // Koblenz
    expect(isInsideRlp({ lat: 49.9988, lng: 8.2738 })).toBe(true); // Mainz
    expect(isInsideRlp({ lat: 50.9375, lng: 6.9603 })).toBe(false); // Köln
    expect(isInsideRlp({ lat: 49.2402, lng: 6.9969 })).toBe(false); // Saarbrücken
  });
});

describe('tile provider', () => {
  const tileset: TerrainTileset = {
    id: 'test', label: 'Test', url: (z, x, y) => `${z}/${x}/${y}`, tileSize: 4, zooms: [2, 1], attribution: 'test',
  };

  it('samples the tile with sub-pixel interpolation', async () => {
    const provider = createTileProvider(tileset, async () => rampTile(4, 100));
    // Tile 2/2/1 starts at global pixel x = 8; a point between pixel centres 9 and 10 gives 101.5.
    const lng = ((9.5 + 0.5) / 16) * 360 - 180;
    const result = await provider.fetch([{ lat: 0, lng }]);
    expect(result.elevations[0]).toBeCloseTo(101.5, 5);
  });

  it('falls back to a lower zoom level when a tile is missing', async () => {
    const requested: string[] = [];
    const provider = createTileProvider(tileset, async (url) => {
      requested.push(url);
      return url.startsWith('2/') ? null : rampTile(4, 50);
    });
    const result = await provider.fetch([{ lat: 10, lng: 10 }]);
    expect(result.elevations[0]).not.toBeNull();
    expect(requested.some((url) => url.startsWith('1/'))).toBe(true);
  });

  it('returns null when no zoom level is available', async () => {
    const provider = createTileProvider(tileset, async () => null);
    expect((await provider.fetch([{ lat: 10, lng: 10 }])).elevations).toEqual([null]);
  });

  it('labels 1 m data inside Rheinland-Pfalz as DGM1', async () => {
    const provider = createTileProvider(MAPTERHORN, async () => rampTile(512, 60));
    const result = await provider.fetch([{ lat: 50.3647, lng: 7.6061 }]);
    expect(result.source.label).toContain('DGM1 Rheinland-Pfalz');
    expect(result.source.resolutionMeters).toBe(1);
    expect(result.source.attribution).toContain('LVermGeoRP');
  });
});

describe('fetchElevationProfile', () => {
  const points = [{ lat: 50, lng: 7 }, { lat: 50.001, lng: 7 }, { lat: 50.002, lng: 7 }];

  it('asks the next provider only for missing points', async () => {
    const asked: number[] = [];
    const providers: ElevationProvider[] = [
      { id: 'fine', fetch: async (requested) => ({ elevations: requested.map((_, index) => (index === 1 ? null : 100)), source: source('fine', 1) }) },
      { id: 'coarse', fetch: async (requested) => { asked.push(requested.length); return { elevations: requested.map(() => 200), source: source('coarse', 30) }; } },
    ];
    const result = await fetchElevationProfile(points, providers);
    expect(result.elevations).toEqual([100, 200, 100]);
    expect(asked).toEqual([1]);
    expect(result.source.id).toBe('coarse');
  });

  it('continues with the next provider when one throws', async () => {
    const providers: ElevationProvider[] = [
      { id: 'broken', fetch: async () => { throw new Error('offline'); } },
      { id: 'backup', fetch: async (requested) => ({ elevations: requested.map(() => 42), source: source('backup', 30) }) },
    ];
    expect((await fetchElevationProfile(points, providers)).elevations).toEqual([42, 42, 42]);
  });

  it('throws instead of returning 0 m when no provider has data', async () => {
    const providers: ElevationProvider[] = [
      { id: 'empty', fetch: async (requested) => ({ elevations: requested.map(() => null), source: source('empty', 1) }) },
    ];
    await expect(fetchElevationProfile(points, providers)).rejects.toBeInstanceOf(ElevationUnavailableError);
  });
});
