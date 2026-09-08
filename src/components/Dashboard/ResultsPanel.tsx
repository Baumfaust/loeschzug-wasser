import React from 'react';
import { type CalculationResult } from '../../types/water';

interface ResultsPanelProps {
  result: CalculationResult;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result }) => {
  return (
    <div className="absolute left-3 right-3 top-16 z-[1000] max-h-[42vh] w-auto space-y-3 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur-md sm:left-auto sm:right-4 sm:top-4 sm:max-h-none sm:w-80 sm:space-y-4 sm:p-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="font-bold text-sm text-cyan-400 flex items-center space-x-2">
          <span>📊</span>
          <span>Berechnungsergebnis</span>
        </h3>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
          Aktiv
        </span>
      </div>

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
          <span>Gesamter Reibungsverlust:</span>
          <span className="font-mono text-amber-300">{result.frictionLossTotal} bar</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Höhendifferenz ($\Delta h$):</span>
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
  );
};
