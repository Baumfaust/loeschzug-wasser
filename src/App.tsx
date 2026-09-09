import { useEffect, useRef, useState } from 'react';
import { useWaterStore } from './store/useWaterStore';
import { readShareState, createShareUrl } from './utils/share';
import { calculateWaterRelay } from './utils/hydraulics';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapView } from './components/Map/MapView';
import { ResultsPanel } from './components/Dashboard/ResultsPanel';
import { ElevationChart } from './components/Dashboard/ElevationChart';

export function App() {
  const { waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions, loadSharedState } = useWaterStore();
  const [hoveredDistance, setHoveredDistance] = useState<number | null>(null);
  const hasLoadedShareState = useRef(false);

  useEffect(() => {
    const sharedState = readShareState();
    if (sharedState) loadSharedState(sharedState);
    hasLoadedShareState.current = true;
  }, [loadSharedState]);

  useEffect(() => {
    if (!hasLoadedShareState.current) return;
    window.history.replaceState(null, '', createShareUrl({ waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions }));
  }, [waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const calculationResult = calculateWaterRelay(waypoints, hoseConfig, pumpConfig, pumpPositions);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-slate-950 font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="relative flex-1 flex h-full min-w-0 w-full">
        <MapView result={calculationResult} hoveredDistance={hoveredDistance} onHoverDistance={setHoveredDistance} />
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="absolute left-3 top-3 z-[1100] rounded-xl border border-slate-600 bg-slate-900/95 px-3 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-md md:hidden"
          aria-label="Menü öffnen"
        >
          ☰ Menü
        </button>
        <ResultsPanel result={calculationResult} />
        <ElevationChart result={calculationResult} hoveredDistance={hoveredDistance} onHoverDistance={setHoveredDistance} />
      </main>
    </div>
  );
}

export default App;

