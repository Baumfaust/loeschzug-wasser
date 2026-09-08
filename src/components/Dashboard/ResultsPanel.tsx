import React from 'react';
import { type CalculationResult } from '../../types/water';

type ResultsView = 'normal' | 'compact' | 'hidden';

interface ResultsPanelProps {
  result: CalculationResult;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result }) => {
  const [view, setView] = React.useState<ResultsView>('normal');

  return (
    <>
      {view === 'hidden' && (
        <button
          type="button"
          onClick={() => setView('compact')}
          className="absolute right-3 top-16 z-[1000] rounded-xl border border-slate-600 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md sm:hidden"
        >
          📊 Ergebnis
        </button>
      )}
      <div className={`${view === 'hidden' ? 'hidden sm:block' : ''} absolute left-3 right-3 top-16 z-[1000] w-auto overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md sm:left-auto sm:right-4 sm:top-4 sm:w-80 ${view === 'compact' ? 'max-h-24 p-2' : 'max-h-[42vh] p-3 sm:max-h-none sm:p-4'}`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="flex items-center space-x-2 text-sm font-bold text-cyan-400">
          <span>📊</span><span>Berechnungsergebnis</span>
        </h3>
        <div className="flex items-center gap-1">
          <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-300">Aktiv</span>
          <button type="button" onClick={() => setView('hidden')} className="rounded px-1.5 text-slate-400 hover:bg-slate-800 hover:text-white sm:hidden" aria-label="Ergebnis ausblenden">×</button>
        </div>
      </div>

      <div className="mt-2 flex gap-1 sm:hidden">
        {(['normal', 'compact', 'hidden'] as ResultsView[]).map((mode) => (
          <button key={mode} type="button" onClick={() => setView(mode)} className={`flex-1 rounded border px-2 py-1 text-[10px] ${view === mode ? 'border-cyan-500 bg-cyan-950 text-cyan-200' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
            {mode === 'normal' ? 'Normal' : mode === 'compact' ? 'Kompakt' : 'Aus'}
          </button>
        ))}
      </div>

      {view === 'compact' ? (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] sm:hidden">
          <div className="rounded bg-slate-800 p-1"><div className="text-slate-400">Distanz</div><strong>{result.mapDistance >= 1000 ? `${(result.mapDistance / 1000).toFixed(1)} km` : `${Math.round(result.mapDistance)} m`}</strong></div>
          <div className="rounded bg-slate-800 p-1"><div className="text-slate-400">B-Schläuche</div><strong>{result.totalBProvisions}</strong></div>
          <div className="rounded bg-slate-800 p-1"><div className="text-slate-400">Pumpen</div><strong>{result.pumpStations.length}</strong></div>
        </div>
      ) : null}

      <div className={view === 'compact' ? 'hidden sm:block' : ''}>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/50">
          <div className="text-[11px] text-slate-400 mb-0.5">Karten-Distanz</div>
          <div className="font-bold text-sm text-white font-mono">
            {result.mapDistance >= 1000
              ? `${(result.mapDistance / 1000).toFixed(2)} km`
              : `${Math.round(result.mapDistance)} m`}
          </div>
        </div>

        <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/50">
          <div className="text-[11px] text-slate-400 mb-0.5">Effektive Distanz</div>
          <div className="font-bold text-sm text-cyan-300 font-mono">
            {result.effectiveDistance >= 1000
              ? `${(result.effectiveDistance / 1000).toFixed(2)} km`
              : `${Math.round(result.effectiveDistance)} m`}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-950/60 to-cyan-950/60 p-3 rounded-xl border border-blue-800/40 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-200">B-Schläuche (20m):</span>
          <span className="font-bold text-lg text-white font-mono bg-blue-900/60 px-2.5 py-0.5 rounded border border-blue-700">
            {result.totalBProvisions} Stk.
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-blue-200">Relais-Pumpen nötig:</span>
          <span className="font-bold text-cyan-300 font-mono bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
            {result.pumpStations.length}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800">
        <div className="flex justify-between text-slate-300">
          <span>Reibungsverlust:</span>
          <span className="font-mono text-amber-300">{result.frictionLossTotal} bar</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Netto-Druckverlust:</span>
          <span className="font-mono text-rose-300">{result.netPressureLoss} bar</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Höhendifferenz (Δh):</span>
          <span className="font-mono text-cyan-300">{result.elevationDeltaTotal} m</span>
        </div>
      </div>

      {result.pumpStations.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-800 max-h-32 overflow-y-auto pr-1">
          <div className="text-[11px] font-semibold text-slate-300">Relais-Pumpen Stationen:</div>
          {result.pumpStations.map((pump) => (
            <div key={pump.pumpIndex} className="text-[10px] bg-slate-800 p-1.5 rounded flex justify-between items-center text-slate-300">
              <span>Pumpe #{pump.pumpIndex} ({Math.round(pump.distance)}m)</span>
              <span className="font-mono text-cyan-400">{Math.round(pump.elevation)}m Höhe</span>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
    </>
  );
};
