import { useState } from 'react';
import { useWaterStore } from './store/useWaterStore';
import { calculateWaterRelay } from './utils/hydraulics';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapView } from './components/Map/MapView';
import { ResultsPanel } from './components/Dashboard/ResultsPanel';
import { ElevationChart } from './components/Dashboard/ElevationChart';

export function App() {
  const { waypoints, hoseConfig, pumpConfig } = useWaterStore();
  const [hoveredDistance, setHoveredDistance] = useState<number | null>(null);

  const calculationResult = calculateWaterRelay(waypoints, hoseConfig, pumpConfig);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <Sidebar />
      <main className="relative flex-1 flex h-full w-full">
        <MapView result={calculationResult} hoveredDistance={hoveredDistance} onHoverDistance={setHoveredDistance} />
        <ResultsPanel result={calculationResult} />
        <ElevationChart result={calculationResult} hoveredDistance={hoveredDistance} onHoverDistance={setHoveredDistance} />
      </main>
    </div>
  );
}

export default App;

