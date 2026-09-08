import React from 'react';
import { useWaterStore } from '../../store/useWaterStore';
import { type PumpProfileType } from '../../types/water';

export const Sidebar: React.FC = () => {
  const {
    hoseConfig,
    pumpConfig,
    updateHoseConfig,
    setPumpProfile,
    updatePumpConfig,
    waypoints,
    clearWaypoints,
    followRoads,
    setFollowRoads,
  } = useWaterStore();

  return (
    <aside className="w-80 bg-slate-900 text-slate-100 flex flex-col h-full shadow-xl z-10 overflow-y-auto border-r border-slate-800 text-xs">
      <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex items-center space-x-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">💧</div>
        <div>
          <h1 className="font-bold text-sm text-white">WasserFörderung</h1>
          <p className="text-[10px] text-slate-400">Lange Wegstrecken</p>
        </div>
      </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Hose Configuration */}
        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 space-y-2">
          <div className="font-semibold text-cyan-400 flex justify-between">
            <span>Schlauch</span>
            <span className="bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800 text-[10px]">B-Schlauch</span>
          </div>
          
          <div className="flex justify-between text-slate-300">
            <span>Standard</span>
            <span className="font-medium text-white">{hoseConfig.lengthPerHose}m / Stk</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <span>Reibungsverlust / 100m</span>
              <span className="font-mono text-cyan-300">{hoseConfig.frictionPer100m} bar</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={hoseConfig.frictionPer100m}
              onChange={(e) => updateHoseConfig({ frictionPer100m: parseFloat(e.target.value) || 0.1 })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <span>Wegreserve</span>
              <span className="font-mono text-cyan-300">+{((hoseConfig.layingFactor - 1) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.3"
              step="0.01"
              value={hoseConfig.layingFactor}
              onChange={(e) => updateHoseConfig({ layingFactor: parseFloat(e.target.value) || 1.1 })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Pump Configuration */}
        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 space-y-2">
          <div className="font-semibold text-cyan-400">Pumpen-Profil</div>

          <div className="grid grid-cols-3 gap-1">
            {(['pfpn-10-1000', 'ts-8-8', 'custom'] as PumpProfileType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPumpProfile(type)}
                className={`py-1 px-1 text-[10px] font-medium rounded border ${
                  pumpConfig.profile === type
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                {type === 'pfpn-10-1000' && 'PFPN 10'}
                {type === 'ts-8-8' && 'TS 8/8'}
                {type === 'custom' && 'Custom'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-300 block mb-0.5">Max Druck (bar)</label>
              <input
                type="number"
                step="0.5"
                min="2"
                max="20"
                disabled={pumpConfig.profile !== 'custom'}
                value={pumpConfig.maxOutputPressure}
                onChange={(e) => updatePumpConfig({ maxOutputPressure: parseFloat(e.target.value) || 10 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-300 block mb-0.5">Min Eingang (bar)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={pumpConfig.minInputPressure}
                onChange={(e) => updatePumpConfig({ minInputPressure: parseFloat(e.target.value) || 1.5 })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Routing */}
        <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 space-y-2">
          <div className="font-semibold text-cyan-400">Routenführung</div>
          <label className="flex items-start gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={followRoads}
              onChange={(e) => setFollowRoads(e.target.checked)}
              className="mt-0.5 accent-cyan-500"
            />
            <span>
              <span className="block text-white">Straßen folgen</span>
              <span className="block text-[10px] text-slate-400">Gilt nur für neu gesetzte Wegpunkte.</span>
            </span>
          </label>
        </div>

        {/* Waypoints */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span>Wegpunkte ({waypoints.length})</span>
            {waypoints.length > 0 && (
              <button onClick={clearWaypoints} className="text-[11px] text-rose-400 hover:underline">
                Löschen
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            {waypoints.length === 0
              ? 'Klicken Sie auf die Karte, um Wegpunkte zu setzen.'
              : `${waypoints.length} Punkt(e) gesetzt.`}
          </p>
        </div>
      </div>

      <div className="p-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 text-center">
        Feuerwehr Wasserförderung v1.0
      </div>
    </aside>
  );
};
