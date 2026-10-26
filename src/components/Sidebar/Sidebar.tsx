import React from 'react';
import QRCode from 'qrcode';
import { useWaterStore } from '../../store/useWaterStore';
import { createShareUrl } from '../../utils/share';
import { type PumpProfileType } from '../../types/water';
import { type ThemePreference, useThemePreference } from '../../utils/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [copyState, setCopyState] = React.useState<'idle' | 'copied'>('idle');
  const [themePreference, setThemePreference] = useThemePreference();
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
    pumpProfiles,
  } = useWaterStore();

  const getShareUrl = () => createShareUrl({ waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions, pumpProfiles }, true);
  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(getShareUrl());
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1800);
  };
  const showQrCode = async () => {
    setQrError(null);
    try {
      const compactShareUrl = createShareUrl({ waypoints, hoseConfig, pumpConfig, followRoads, showHydrants, pumpPositions, pumpProfiles }, true);
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
      {isOpen && <button type="button" onClick={onClose} className="fixed inset-0 z-[1190] bg-backdrop md:hidden" aria-label="Menü schließen" />}
      <aside className={`fixed inset-y-0 left-0 z-[1200] flex w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-line bg-surface text-xs text-fg shadow-xl transition-transform duration-200 md:static md:z-10 md:w-80 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-line bg-surface-2 p-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-strong font-bold text-on-accent">💧</div>
            <div>
              <h1 className="font-bold text-sm text-fg">WasserFörderung</h1>
              <p className="text-[10px] text-muted">Lange Wegstrecken</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg text-muted hover:bg-surface-2 hover:text-fg md:hidden" aria-label="Menü schließen">×</button>
        </div>

      <div className="p-3 space-y-3 flex-1">
        {/* Hose Configuration */}
        <div className="bg-surface-2 p-2.5 rounded-lg border border-line space-y-2">
          <div className="font-semibold text-accent flex justify-between">
            <span>Schlauch</span>
            <span className="bg-accent-soft text-accent-fg px-1.5 py-0.5 rounded border border-line text-[10px]">B-Schlauch</span>
          </div>
          
          <div className="flex justify-between text-fg-2">
            <span>Standard</span>
            <span className="font-medium text-fg">{hoseConfig.lengthPerHose}m / Stk</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1 text-fg-2">
              <span>Reibungsverlust / 100m</span>
              <span className="font-mono text-accent">{hoseConfig.frictionPer100m} bar</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1.0"
              value={hoseConfig.frictionPer100m}
              onChange={(e) => updateHoseConfig({ frictionPer100m: parseFloat(e.target.value) || 1.0 })}
              className="w-full bg-field border border-line rounded px-2 py-1 text-xs text-fg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1 text-fg-2">
              <span>Wegreserve</span>
              <span className="font-mono text-accent">+{((hoseConfig.layingFactor - 1) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.3"
              step="0.01"
              value={hoseConfig.layingFactor}
              onChange={(e) => updateHoseConfig({ layingFactor: parseFloat(e.target.value) || 1.1 })}
              className="w-full accent-accent-strong cursor-pointer"
            />
          </div>
        </div>

        {/* Pump Configuration */}
        <div className="bg-surface-2 p-2.5 rounded-lg border border-line space-y-2">
          <div className="font-semibold text-accent">Pumpen-Profil</div>

          <div className="grid grid-cols-3 gap-1">
            {(['pfpn-10-1000', 'ts-8-8', 'custom'] as PumpProfileType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPumpProfile(type)}
                className={`py-1 px-1 text-[10px] font-medium rounded border ${
                  pumpConfig.profile === type
                    ? 'bg-accent-strong border-accent-strong text-on-accent'
                    : 'bg-field border-line text-fg-2'
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
              <label className="text-[10px] text-fg-2 block mb-0.5">Max Druck (bar)</label>
              <input
                type="number"
                step="0.5"
                min="2"
                max="20"
                disabled={pumpConfig.profile !== 'custom'}
                value={pumpConfig.maxOutputPressure}
                onChange={(e) => updatePumpConfig({ maxOutputPressure: parseFloat(e.target.value) || 10 })}
                className="w-full bg-field border border-line rounded px-2 py-1 text-xs text-fg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-[10px] text-fg-2 block mb-0.5">Min Eingang (bar)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={pumpConfig.minInputPressure}
                onChange={(e) => updatePumpConfig({ minInputPressure: parseFloat(e.target.value) || 1.5 })}
                className="w-full bg-field border border-line rounded px-2 py-1 text-xs text-fg"
              />
            </div>
          </div>
        </div>

        {/* Routing */}
        <div className="bg-surface-2 p-2.5 rounded-lg border border-line space-y-2">
          <div className="font-semibold text-accent">Routenführung</div>
          <label className="flex items-start gap-2 text-fg-2 cursor-pointer">
            <input
              type="checkbox"
              checked={followRoads}
              onChange={(e) => setFollowRoads(e.target.checked)}
              className="mt-0.5 accent-accent-strong"
            />
            <span>
              <span className="block text-fg">Straßen folgen</span>
              <span className="block text-[10px] text-muted">Gilt nur für neu gesetzte Wegpunkte.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-fg-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHydrants}
              onChange={(e) => setShowHydrants(e.target.checked)}
              className="mt-0.5 accent-accent-strong"
            />
            <span>
              <span className="block text-fg">Hydranten anzeigen</span>
              <span className="block text-[10px] text-muted">OSM-Daten im Umkreis von 200 m.</span>
            </span>
          </label>
        </div>

        {/* Appearance */}
        <div className="bg-surface-2 p-2.5 rounded-lg border border-line space-y-2">
          <div className="font-semibold text-accent">Darstellung</div>
          <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Farbschema">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={themePreference === value}
                onClick={() => setThemePreference(value)}
                className={`py-1 px-1 text-[11px] font-medium rounded border ${
                  themePreference === value
                    ? 'bg-accent-strong border-accent-strong text-on-accent'
                    : 'bg-field border-line text-fg-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted">Auto folgt der Einstellung des Geräts. Hell ist bei Sonnenlicht besser lesbar.</p>
        </div>

        {/* Waypoints */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-semibold text-fg-2">
            <span>Wegpunkte ({waypoints.length})</span>
            {waypoints.length > 0 && (
              <button onClick={clearWaypoints} className="text-[11px] text-danger hover:underline">
                Löschen
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted">
            {waypoints.length === 0
              ? 'Klicken Sie auf die Karte, um Wegpunkte zu setzen.'
              : `${waypoints.length} Punkt(e) gesetzt.`}
          </p>
        </div>
      </div>

        <div className="space-y-2 border-t border-line bg-surface-2 p-3">
          <div className="text-[11px] font-semibold text-accent">Teilen</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copyShareUrl} className="rounded border border-line bg-field px-2 py-2 text-[11px] text-fg hover:bg-surface">{copyState === 'copied' ? '✓ Kopiert' : '🔗 Link kopieren'}</button>
            <button type="button" onClick={showQrCode} className="rounded border border-line bg-accent-soft px-2 py-2 text-[11px] text-accent-fg hover:opacity-90">▦ QR-Code</button>
          </div>
          {qrError && <div className="text-center text-[10px] text-danger">{qrError}</div>}
          <div className="text-center text-[10px] text-muted">Alle Eingaben werden im Link gespeichert.</div>
        </div>
        <div className="space-y-1 bg-surface-2 p-2 text-center text-[10px] text-muted">
          <div>Feuerwehr Wasserförderung v1.0</div>
          <a
            href="https://github.com/Baumfaust/loeschzug-wasser"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-accent hover:text-accent hover:underline"
          >
            Über das Projekt auf GitHub
          </a>
        </div>
      </aside>
      {qrCode && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-backdrop p-4" onClick={() => setQrCode(null)}>
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
