import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import { createSharePayload, parseSharePayload } from './share';
import { type ShareState } from './share';

const baseState: ShareState = {
  waypoints: [
    {
      id: 'start', lat: 51, lng: 7, elevation: 100,
    },
    {
      id: 'end', lat: 51.01, lng: 7.02, elevation: 120,
      routeDistance: 3200,
      routePath: [[51, 7], [51.005, 7.004], [51.002, 7.012], [51.01, 7.02]],
      routeSamples: [{ distance: 0, lat: 51, lng: 7, elevation: 100 }],
    },
  ],
  hoseConfig: { lengthPerHose: 20, frictionPer100m: 0.1, layingFactor: 1.1 },
  pumpConfig: { profile: 'pfpn-10-1000', targetFlowRate: 1000, maxOutputPressure: 10, minInputPressure: 1.5 },
  followRoads: true,
  showHydrants: false,
};

describe('share payloads', () => {
  it('preserves routed geometry in compact QR payloads', () => {
    const parsed = parseSharePayload(createSharePayload(baseState, true));
    expect(parsed?.waypoints[1].routeDistance).toBe(3200);
    expect(parsed?.waypoints[1].routePath).toEqual(baseState.waypoints[1].routePath);
    expect(parsed?.waypoints[1].routeSamples).toBeUndefined();
  });

  it('round-trips the complete link payload', () => {
    expect(parseSharePayload(createSharePayload(baseState))).toEqual(baseState);
  });

  it('round-trips a large waypoint set and checks QR capacity', async () => {
    const createWaypoints = (count: number) => Array.from({ length: count }, (_, index) => ({
      id: `wp-${index}`,
      lat: 51 + index * 0.0001,
      lng: 7 + index * 0.0001,
      elevation: 100 + index,
      ...(index > 0 ? {
        routeDistance: 15,
        routePath: [[51 + (index - 1) * 0.0001, 7 + (index - 1) * 0.0001], [51 + index * 0.0001, 7 + index * 0.0001]] as [number, number][],
      } : {}),
    }));

    const hugeState = { ...baseState, waypoints: createWaypoints(1000) };
    const hugePayload = createSharePayload(hugeState, true);
    const hugeParsed = parseSharePayload(hugePayload);
    expect(hugeParsed?.waypoints).toHaveLength(1000);
    expect(hugeParsed?.waypoints[999].routePath).toEqual(hugeState.waypoints[999].routePath);
    await expect(QRCode.toDataURL(`https://example.test/?config=${hugePayload}`, { errorCorrectionLevel: 'L' })).rejects.toThrow('too big');

    const qrState = { ...baseState, waypoints: createWaypoints(50) };
    const qrPayload = createSharePayload(qrState, true);
    await expect(QRCode.toDataURL(`https://example.test/?config=${qrPayload}`, { errorCorrectionLevel: 'L' })).resolves.toMatch(/^data:image\/png;base64,/);
  });
});
