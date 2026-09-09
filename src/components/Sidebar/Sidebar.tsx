import React from 'react';
import QRCode from 'qrcode';
import { useWaterStore } from '../../store/useWaterStore';
import { createShareUrl } from '../../utils/share';
import { type PumpProfileType } from '../../types/water';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<'idle' | 'copied'>('idle');
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
    showHydrants,
    setShowHydrants,
    pumpPositions,
  } = useWaterStore();

  const getShareUrl = () => createShareUrl({ waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions }, true);
  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(getShareUrl());
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1800);
  };
  const showQrCode = async () => {
    setQrError(null);
    try {
      const compactShareUrl = createShareUrl({ waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions }, true);
      setQrCode(await QRCode.toDataURL(compactShareUrl, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'L',
      }));
    } catch {
      setQrCode(null);
      setQrError('Der QR-Code konnte nicht erstellt werden. Bitte kopieren Sie stattdessen den Link.');
    }
  };

  return (
    <>
      {isOpen && <button type="button" onClick={onClose} className="fixed inset-0 z-[1190] bg-slate-950/60 md:hidden" aria-label="Menü schließen" />}
      <aside className={`fixed inset-y-0 left-0 z-[1200] flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-slate-800 bg-slate-900 text-xs text-slate-100 shadow-xl transition-transform duration-200 md:static md:z-10 md:w-80 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 p-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">💧</div>
            <div>
              <h1 className="font-bold text-sm text-white">WasserFörderung</h1>
              <p className="text-[10px] text-slate-400">Lange Wegstrecken</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-800 hover:text-white md:hidden" aria-label="Menü schließen">×</button>
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
              onChange={(e) => updateHoseConfig({ frictionPer100m: parseFloat(e.target.value) || 1.0 })}
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
          <label className="flex items-start gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showHydrants}
              onChange={(e) => setShowHydrants(e.target.checked)}
              className="mt-0.5 accent-cyan-500"
            />
            <span>
              <span className="block text-white">Hydranten anzeigen</span>
              <span className="block text-[10px] text-slate-400">OSM-Daten im Umkreis von 200 m.</span>
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

        <div className="space-y-2 border-t border-slate-800 bg-slate-950 p-3">
          <div className="text-[11px] font-semibold text-cyan-400">Teilen</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copyShareUrl} className="rounded border border-slate-700 bg-slate-800 px-2 py-2 text-[11px] text-white hover:bg-slate-700">{copyState === 'copied' ? '✓ Kopiert' : '🔗 Link kopieren'}</button>
            <button type="button" onClick={showQrCode} className="rounded border border-cyan-800 bg-cyan-950 px-2 py-2 text-[11px] text-cyan-200 hover:bg-cyan-900">▦ QR-Code</button>
          </div>
          {qrError && <div className="text-center text-[10px] text-rose-300">{qrError}</div>}
          <div className="text-center text-[10px] text-slate-500">Alle Eingaben werden im Link gespeichert.</div>
        </div>
        <div className="space-y-1 bg-slate-950 p-2 text-center text-[10px] text-slate-400">
          <div>Feuerwehr Wasserförderung v1.0</div>
          <a
            href="https://github.com/Baumfaust/loeschzug-wasser"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Über das Projekt auf GitHub
          </a>
        </div>
      </aside>
      {qrCode && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/75 p-4" onClick={() => setQrCode(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 text-center text-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="mb-3 font-bold">Konfiguration scannen</h2>
            <img src={qrCode} alt="QR-Code der aktuellen Konfiguration" className="mx-auto w-full" />
            <button type="button" onClick={() => setQrCode(null)} className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm text-white">Schließen</button>
          </div>
        </div>
      )}
    </>
  );
};
