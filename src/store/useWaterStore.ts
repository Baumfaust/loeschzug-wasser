import { create } from 'zustand';
import { type Waypoint, type HoseConfig, type PumpConfig, type PumpProfileType } from '../types/water';

interface WaterStore {
  waypoints: Waypoint[];
  hoseConfig: HoseConfig;
  pumpConfig: PumpConfig;
  
  followRoads: boolean;
  showHydrants: boolean;

  // Actions
  setFollowRoads: (followRoads: boolean) => void;
  setShowHydrants: (showHydrants: boolean) => void;
  addWaypoint: (lat: number, lng: number, elevation?: number, route?: { followsRoads: boolean; routeDistance?: number; routePath?: [number, number][]; routeSamples?: Waypoint['routeSamples'] }) => void;
  updateWaypointElevation: (id: string, elevation: number) => void;
  updateWaypointRoute: (id: string, route: { routeDistance: number; routePath: [number, number][]; routeSamples: Waypoint['routeSamples'] }) => void;
  removeWaypoint: (id: string) => void;
  clearWaypoints: () => void;
  reorderWaypoints: (startIndex: number, endIndex: number) => void;
  
  updateHoseConfig: (config: Partial<HoseConfig>) => void;
  updatePumpConfig: (config: Partial<PumpConfig>) => void;
  setPumpProfile: (profile: PumpProfileType) => void;
}

const defaultHoseConfig: HoseConfig = {
  lengthPerHose: 20,
  frictionPer100m: 0.1,
  layingFactor: 1.1, // +10%
};

const defaultPumpConfig: PumpConfig = {
  profile: 'pfpn-10-1000',
  targetFlowRate: 1000,
  maxOutputPressure: 10.0,
  minInputPressure: 1.5,
};

export const useWaterStore = create<WaterStore>((set) => ({
  waypoints: [],
  followRoads: true,
  showHydrants: false,
  hoseConfig: defaultHoseConfig,
  pumpConfig: defaultPumpConfig,

  setFollowRoads: (followRoads) => set({ followRoads }),
  setShowHydrants: (showHydrants) => set({ showHydrants }),

  addWaypoint: (lat, lng, elevation = 0, route) =>
    set((state) => ({
      waypoints: [
        ...state.waypoints,
        {
          id: Math.random().toString(36).substring(2, 9),
          lat,
          lng,
          elevation,
          ...route,
        },
      ],
    })),

  updateWaypointElevation: (id, elevation) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) =>
        wp.id === id ? { ...wp, elevation, manualElevationOverride: true } : wp
      ),
    })),

  updateWaypointRoute: (id, route) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp) => (wp.id === id ? { ...wp, ...route } : wp)),
    })),

  removeWaypoint: (id) =>
    set((state) => ({
      waypoints: state.waypoints.filter((wp) => wp.id !== id),
    })),

  clearWaypoints: () => set({ waypoints: [] }),

  reorderWaypoints: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.waypoints);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { waypoints: result };
    }),

  updateHoseConfig: (config) =>
    set((state) => ({
      hoseConfig: { ...state.hoseConfig, ...config },
    })),

  updatePumpConfig: (config) =>
    set((state) => ({
      pumpConfig: { ...state.pumpConfig, ...config },
    })),

  setPumpProfile: (profile) =>
    set((state) => {
      let newConfig = { ...state.pumpConfig, profile };
      if (profile === 'pfpn-10-1000') {
        newConfig = {
          ...newConfig,
          targetFlowRate: 1000,
          maxOutputPressure: 10.0,
          minInputPressure: 1.5,
        };
      } else if (profile === 'ts-8-8') {
        newConfig = {
          ...newConfig,
          targetFlowRate: 800,
          maxOutputPressure: 8.0,
          minInputPressure: 1.5,
        };
      }
      return { pumpConfig: newConfig };
    }),
}));
