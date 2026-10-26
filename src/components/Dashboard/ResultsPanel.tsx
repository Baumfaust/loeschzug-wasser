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
          className="absolute right-3 top-16 z-[1000] rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs font-semibold text-fg shadow-xl backdrop-blur-md sm:hidden"
        >
          📊 Ergebnis
        </button>
      )}
      <div className={`${view === 'hidden' ? 'hidden sm:block' : ''} absolute left-3 right-3 top-16 z-[1000] w-auto overflow-y-auto rounded-xl border border-line bg-surface/95 text-fg shadow-2xl backdrop-blur-md sm:left-auto sm:right-4 sm:top-4 sm:w-80 ${view === 'compact' ? 'max-h-24 p-2' : 'max-h-[42vh] p-3 sm:max-h-none sm:p-4'}`}>
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <h3 className="flex items-center space-x-2 text-sm font-bold text-accent">
          <span>📊</span><span>Berechnungsergebnis</span>
        </h3>
        <div className="flex items-center gap-1">
          <span className="rounded border border-line bg-success-soft px-2 py-0.5 text-[10px] font-mono text-success">Aktiv</span>
          <button type="button" onClick={() => setView('hidden')} className="rounded px-1.5 text-muted hover:bg-surface-2 hover:text-fg sm:hidden" aria-label="Ergebnis ausblenden">×</button>
        </div>
      </div>

      <div className="mt-2 flex gap-1 sm:hidden">
        {(['normal', 'compact', 'hidden'] as ResultsView[]).map((mode) => (
          <button key={mode} type="button" onClick={() => setView(mode)} className={`flex-1 rounded border px-2 py-1 text-[10px] ${view === mode ? 'border-accent-strong bg-accent-soft text-accent-fg' : 'border-line bg-surface-2 text-muted'}`}>
            {mode === 'normal' ? 'Normal' : mode === 'compact' ? 'Kompakt' : 'Aus'}
          </button>
        ))}
      </div>

      {view === 'compact' ? (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] sm:hidden">
          <div className="rounded bg-surface-2 p-1"><div className="text-muted">Distanz</div><strong>{result.mapDistance >= 1000 ? `${(result.mapDistance / 1000).toFixed(1)} km` : `${Math.round(result.mapDistance)} m`}</strong></div>
          <div className="rounded bg-surface-2 p-1"><div className="text-muted">B-Schläuche</div><strong>{result.totalBProvisions}</strong></div>
          <div className="rounded bg-surface-2 p-1"><div className="text-muted">Pumpen</div><strong>{result.pumpStations.length}</strong></div>
        </div>
      ) : null}

      <div className={view === 'compact' ? 'hidden sm:block' : ''}>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="bg-surface-2 p-2.5 rounded-lg border border-line">
          <div className="text-[11px] text-muted mb-0.5">Karten-Distanz</div>
          <div className="font-bold text-sm text-fg font-mono">
            {result.mapDistance >= 1000
              ? `${(result.mapDistance / 1000).toFixed(2)} km`
              : `${Math.round(result.mapDistance)} m`}
          </div>
        </div>

        <div className="bg-surface-2 p-2.5 rounded-lg border border-line">
          <div className="text-[11px] text-muted mb-0.5">Effektive Distanz</div>
          <div className="font-bold text-sm text-accent font-mono">
            {result.effectiveDistance >= 1000
              ? `${(result.effectiveDistance / 1000).toFixed(2)} km`
              : `${Math.round(result.effectiveDistance)} m`}
          </div>
        </div>
      </div>

      <div className="bg-accent-soft p-3 rounded-xl border border-line space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-accent-fg">B-Schläuche (20m):</span>
          <span className="font-bold text-lg text-fg font-mono bg-surface px-2.5 py-0.5 rounded border border-line">
            {result.totalBProvisions} Stk.
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-accent-fg">Relais-Pumpen nötig:</span>
          <span className="font-bold text-fg font-mono bg-surface px-2 py-0.5 rounded border border-line">
            {result.pumpStations.length}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs pt-1 border-t border-line">
        <div className="flex justify-between text-fg-2">
          <span>Reibungsverlust:</span>
          <span className="font-mono text-warning">{result.frictionLossTotal} bar</span>
        </div>
        <div className="flex justify-between text-fg-2">
          <span>Netto-Druckverlust:</span>
          <span className="font-mono text-danger">{result.netPressureLoss} bar</span>
        </div>
        <div className="flex justify-between text-fg-2">
          <span>Höhendifferenz (Δh):</span>
          <span className="font-mono text-accent">{result.elevationDeltaTotal} m</span>
        </div>
      </div>

      {result.pumpStations.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-line max-h-32 overflow-y-auto pr-1">
          <div className="text-[11px] font-semibold text-fg-2">Relais-Pumpen Stationen:</div>
          {result.pumpStations.map((pump) => (
            <div key={pump.pumpIndex} className="text-[10px] bg-surface-2 p-1.5 rounded flex justify-between items-center text-fg-2">
              <span>Pumpe #{pump.pumpIndex} ({Math.round(pump.distance)}m)</span>
              <span className="font-mono text-accent">{Math.round(pump.elevation)}m Höhe</span>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
    </>
  );
};
