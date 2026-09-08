import { useWaterStore } from './store/useWaterStore';
import { calculateWaterRelay } from './utils/hydraulics';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapView } from './components/Map/MapView';
import { ResultsPanel } from './components/Dashboard/ResultsPanel';
import { ElevationChart } from './components/Dashboard/ElevationChart';

export function App() {
  const { waypoints, hoseConfig, pumpConfig } = useWaterStore();

  const calculationResult = calculateWaterRelay(waypoints, hoseConfig, pumpConfig);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <Sidebar />
      <main className="relative flex-1 flex h-full w-full">
        <MapView result={calculationResult} />
        <ResultsPanel result={calculationResult} />
        <ElevationChart result={calculationResult} />
      </main>
    </div>
  );
}

export default App;

