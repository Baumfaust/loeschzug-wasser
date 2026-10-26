import { type ElevationSourceInfo } from '../../types/water';

export interface ElevationPoint {
  lat: number;
  lng: number;
}

export interface ProviderResult {
  // null marks a point the provider cannot answer, so the next provider is asked.
  elevations: (number | null)[];
  source: ElevationSourceInfo;
}

export interface ElevationProvider {
  id: string;
  fetch(points: ElevationPoint[]): Promise<ProviderResult>;
}

export interface ElevationResult {
  elevations: number[];
  source: ElevationSourceInfo;
}

export class ElevationUnavailableError extends Error {
  readonly missing: number;

  constructor(missing: number) {
    super(`Keine Höhendaten für ${missing} Punkte verfügbar`);
    this.name = 'ElevationUnavailableError';
    this.missing = missing;
  }
}
