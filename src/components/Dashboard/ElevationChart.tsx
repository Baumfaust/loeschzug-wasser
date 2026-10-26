import React from 'react';
import { type CalculationResult } from '../../types/water';
import { decimateForWidth, formatDistance, formatNumber, niceScale } from '../../utils/chartScale';
import { elevationStats, valueAtDistance } from '../../utils/elevationStats';

interface ElevationChartProps {
  result: CalculationResult;
  hoveredDistance: number | null;
  onHoverDistance: (distance: number | null) => void;
  onRetryElevation: () => void;
  minimumInputPressure: number;
}

const COLLAPSED_STORAGE_KEY = 'loeschzug-wasser:chart-collapsed';
const MARGIN = { left: 46, right: 14 };

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function useElementWidth(): [(element: HTMLDivElement | null) => void, number] {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    // The observer reports the initial size right after observe(), so no synchronous measurement is needed.
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width];
}

function formatMeters(value: number): string {
  return `${formatNumber(value, Math.abs(value) < 10 ? 1 : 0)} m`;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({ result, hoveredDistance, onHoverDistance, onRetryElevation, minimumInputPressure }) => {
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  const [plotRef, width] = useElementWidth();

  if (result.segmentDetails.length === 0) return null;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Not persisted when storage is unavailable.
    }
  };

  // Already smoothed in calculateWaterRelay, so the chart matches the pump calculation.
  const samples = result.profileSamples.length > 0
    ? result.profileSamples
    : result.segmentDetails.flatMap((segment, index) => [
        { distance: index === 0 ? 0 : result.segmentDetails[index - 1].accumulatedDistance, elevation: segment.elevationStart },
        { distance: segment.accumulatedDistance, elevation: segment.elevationEnd },
      ]);
  const stats = elevationStats(samples);
  const { status: elevationStatus, sources: elevationSources } = result.elevationInfo;

  return (
    <div className="absolute bottom-2 left-2 right-2 z-[1000] ml-0 rounded-xl border border-line bg-surface/95 p-2 text-fg shadow-2xl backdrop-blur-md sm:bottom-4 sm:left-96 sm:right-4 sm:ml-6 sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-fg">Höhenprofil</h4>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-2 hover:text-fg"
        >
          {collapsed ? 'Diagramm zeigen ▴' : 'Diagramm ausblenden ▾'}
        </button>
      </div>

      {stats && (
        <dl className="mb-2 grid grid-cols-3 gap-1.5 text-center sm:grid-cols-6">
          <StatTile label="Anstieg gesamt" value={`↑ ${formatMeters(stats.ascent)}`} />
          <StatTile label="Gefälle gesamt" value={`↓ ${formatMeters(stats.descent)}`} />
          <StatTile label="Start → Ziel" value={`${stats.netChange >= 0 ? '+' : '−'}${formatMeters(Math.abs(stats.netChange))}`} />
          <StatTile label="Höchster Punkt" value={formatMeters(stats.max)} />
          <StatTile label="Tiefster Punkt" value={formatMeters(stats.min)} />
          <StatTile label="Steilste Stelle" value={`↑ ${formatNumber(stats.maxUphillPercent, 0)} % · ↓ ${formatNumber(stats.maxDownhillPercent, 0)} %`} />
        </dl>
      )}

      {elevationStatus === 'error' && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-danger bg-danger-soft px-2 py-1 text-xs text-danger">
          <span>⚠ Höhendaten fehlen – Ergebnis unzuverlässig</span>
          <button type="button" onClick={onRetryElevation} className="rounded-md border border-danger px-2 py-0.5 font-semibold">Neu laden</button>
        </div>
      )}
      {elevationStatus === 'pending' && (
        <div className="mb-2 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-fg-2">Höhendaten werden geladen…</div>
      )}

      {!collapsed && (
        <div ref={plotRef} className="relative w-full">
          {width > 0 && (
            <ProfilePlot
              width={width}
              result={result}
              samples={samples}
              minimumInputPressure={minimumInputPressure}
              hoveredDistance={hoveredDistance}
              onHoverDistance={onHoverDistance}
            />
          )}
        </div>
      )}

      {elevationSources.length > 0 && (
        <div className="mt-1 text-[10px] leading-tight text-muted">
          Höhendaten: {elevationSources.map((source) => `${source.label} (~${formatResolution(source.resolutionMeters)})${source.attribution ? `, ${source.attribution}` : ''}`).join(' · ')}
        </div>
      )}
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-surface-2 px-1.5 py-1">
    <dt className="text-[11px] leading-tight text-muted">{label}</dt>
    <dd className="text-sm font-semibold leading-tight text-fg">{value}</dd>
  </div>
);

interface ProfilePlotProps {
  width: number;
  result: CalculationResult;
  samples: { distance: number; elevation: number }[];
  minimumInputPressure: number;
  hoveredDistance: number | null;
  onHoverDistance: (distance: number | null) => void;
}

const ProfilePlot: React.FC<ProfilePlotProps> = ({ width, result, samples, minimumInputPressure, hoveredDistance, onHoverDistance }) => {
  const compact = width < 640;
  const elevationTop = 20;
  const elevationHeight = compact ? 92 : 120;
  const pressureTop = elevationTop + elevationHeight + 30;
  const pressureHeight = compact ? 64 : 84;
  const axisY = pressureTop + pressureHeight;
  const height = axisY + 22;
  const plotWidth = Math.max(40, width - MARGIN.left - MARGIN.right);
  const totalDistance = result.mapDistance || samples[samples.length - 1]?.distance || 1;
  const x = (distance: number) => MARGIN.left + (distance / totalDistance) * plotWidth;

  // Elevation panel: at least 4 m of range, so a flat route doesn't look dramatic.
  const elevations = samples.map((sample) => sample.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;
  const elevationPad = Math.max(1, elevationRange * 0.1, (4 - elevationRange) / 2);
  const elevationScale = niceScale(minElevation - elevationPad, maxElevation + elevationPad, compact ? 3 : 4);
  const yElevation = (value: number) => elevationTop + (1 - (value - elevationScale.min) / (elevationScale.max - elevationScale.min)) * elevationHeight;

  // Pressure panel starts at 0 bar and always shows the minimum input pressure.
  const pressureSamples = result.pressureProfile;
  const pressureScale = niceScale(0, Math.max(minimumInputPressure, ...pressureSamples.map((sample) => sample.pressure)), compact ? 2 : 3);
  const yPressure = (value: number) => pressureTop + (1 - (Math.max(0, value) - pressureScale.min) / (pressureScale.max - pressureScale.min)) * pressureHeight;

  const elevationLine = decimateForWidth(samples, plotWidth, (sample) => x(sample.distance), (sample) => sample.elevation);
  const elevationPath = linePath(elevationLine, (sample) => x(sample.distance), (sample) => yElevation(sample.elevation));
  const elevationBottom = elevationTop + elevationHeight;
  const elevationArea = elevationLine.length > 1
    ? `${elevationPath} L${x(elevationLine[elevationLine.length - 1].distance).toFixed(1)},${elevationBottom} L${x(elevationLine[0].distance).toFixed(1)},${elevationBottom} Z`
    : '';
  const pressureLine = decimateForWidth(pressureSamples, plotWidth, (sample) => x(sample.distance), (sample) => sample.pressure);
  const pressurePath = linePath(pressureLine, (sample) => x(sample.distance), (sample) => yPressure(sample.pressure));

  const distanceScale = niceScale(0, totalDistance, Math.max(2, Math.floor(plotWidth / 110)));
  const distanceTicks = distanceScale.ticks.filter((tick) => tick <= totalDistance + 1e-6);
  const distanceDigits = distanceScale.step < 1000 ? 1 : 0;

  const hover = hoveredDistance === null ? null : describePoint(hoveredDistance, samples, result);
  const handlePointer = (event: React.PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    onHoverDistance(ratio * totalDistance);
  };

  return (
    <>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Höhenprofil und Druckverlauf über ${formatDistance(totalDistance)}`}
        style={{ display: 'block', fontSize: 12 }}
      >
        {/* Elevation panel */}
        <text x={MARGIN.left} y={elevationTop - 7} fill="var(--t-fg-2)" fontWeight={600}>Höhe (m)</text>
        {elevationScale.ticks.map((tick) => (
          <g key={`elevation-${tick}`}>
            <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={yElevation(tick)} y2={yElevation(tick)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={MARGIN.left - 6} y={yElevation(tick) + 4} textAnchor="end" fill="var(--t-muted)">{formatNumber(tick)}</text>
          </g>
        ))}
        {elevationArea && <path d={elevationArea} fill="var(--chart-elevation)" fillOpacity={0.14} />}
        <path d={elevationPath} fill="none" stroke="var(--chart-elevation)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Pressure panel */}
        <text x={MARGIN.left} y={pressureTop - 7} fill="var(--t-fg-2)" fontWeight={600}>Druck (bar)</text>
        {pressureScale.ticks.map((tick) => (
          <g key={`pressure-${tick}`}>
            <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={yPressure(tick)} y2={yPressure(tick)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={MARGIN.left - 6} y={yPressure(tick) + 4} textAnchor="end" fill="var(--t-muted)">{formatNumber(tick)}</text>
          </g>
        ))}
        <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={yPressure(minimumInputPressure)} y2={yPressure(minimumInputPressure)} stroke="var(--chart-critical)" strokeWidth={1.5} strokeDasharray="5 4" />
        {/* Labelled at the start, where the pressure is highest and the line is clear. */}
        <text x={MARGIN.left + 6} y={yPressure(minimumInputPressure) - 4} textAnchor="start" fill="var(--t-fg-2)" fontSize={11} paintOrder="stroke" stroke="var(--chart-surface)" strokeWidth={3}>
          Mindestdruck {formatNumber(minimumInputPressure, 1)} bar
        </text>
        {pressurePath && <path d={pressurePath} fill="none" stroke="var(--chart-pressure)" strokeWidth={2} strokeLinejoin="round" />}

        {/* Distance axis */}
        <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={axisY} y2={axisY} stroke="var(--chart-axis)" strokeWidth={1} />
        {distanceTicks.map((tick, index) => (
          <text
            key={`distance-${tick}`}
            x={x(tick)}
            y={axisY + 16}
            textAnchor={index === 0 ? 'start' : x(tick) > MARGIN.left + plotWidth - 30 ? 'end' : 'middle'}
            fill="var(--t-muted)"
          >
            {formatDistance(tick, distanceDigits)}
          </text>
        ))}

        {/* Relay pumps across both panels */}
        {result.pumpStations.map((pump) => (
          <g key={`pump-${pump.pumpIndex}`}>
            <line x1={x(pump.distance)} x2={x(pump.distance)} y1={elevationTop} y2={axisY} stroke="var(--t-fg-2)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(pump.distance)} cy={yElevation(pump.elevation)} r={4.5} fill="var(--t-fg)" stroke="var(--chart-surface)" strokeWidth={2} />
            <text x={x(pump.distance)} y={elevationTop - 7} textAnchor="middle" fill="var(--t-fg)" fontWeight={700} paintOrder="stroke" stroke="var(--chart-surface)" strokeWidth={3}>
              P{pump.pumpIndex}
            </text>
          </g>
        ))}

        {/* Hover crosshair, also driven by hovering the route on the map */}
        {hover && (
          <g pointerEvents="none">
            <line x1={x(hover.distance)} x2={x(hover.distance)} y1={elevationTop} y2={axisY} stroke="var(--t-fg)" strokeWidth={1} />
            <circle cx={x(hover.distance)} cy={yElevation(hover.elevation)} r={4.5} fill="var(--chart-elevation)" stroke="var(--chart-surface)" strokeWidth={2} />
            {hover.pressure !== null && (
              <circle cx={x(hover.distance)} cy={yPressure(hover.pressure)} r={4.5} fill="var(--chart-pressure)" stroke="var(--chart-surface)" strokeWidth={2} />
            )}
          </g>
        )}

        <rect
          x={MARGIN.left}
          y={elevationTop}
          width={plotWidth}
          height={axisY - elevationTop}
          fill="transparent"
          style={{ touchAction: 'pan-y' }}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => onHoverDistance(null)}
        />
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute top-5 rounded-lg border border-line bg-surface px-2 py-1 text-xs leading-snug text-fg shadow-lg"
          style={x(hover.distance) > width / 2 ? { right: width - x(hover.distance) + 10 } : { left: x(hover.distance) + 10 }}
        >
          <div className="font-semibold">{formatDistance(hover.distance, 2)}</div>
          <div>Höhe {formatNumber(hover.elevation, 1)} m</div>
          {hover.pressure !== null && <div>Druck {formatNumber(hover.pressure, 1)} bar</div>}
          {hover.gradient !== null && <div>Steigung {hover.gradient >= 0 ? '+' : '−'}{formatNumber(Math.abs(hover.gradient), 1)} %</div>}
        </div>
      )}
    </>
  );
};

function linePath<T>(points: T[], x: (point: T) => number, y: (point: T) => number): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point).toFixed(1)},${y(point).toFixed(1)}`).join(' ');
}

function describePoint(distance: number, samples: { distance: number; elevation: number }[], result: CalculationResult) {
  const elevation = valueAtDistance(samples, distance, (sample) => sample.elevation);
  if (elevation === null) return null;
  const pressure = valueAtDistance(result.pressureProfile, distance, (sample) => sample.pressure);
  const lastDistance = samples[samples.length - 1].distance;
  const from = Math.max(0, distance - 10);
  const to = Math.min(lastDistance, distance + 10);
  const before = valueAtDistance(samples, from, (sample) => sample.elevation);
  const after = valueAtDistance(samples, to, (sample) => sample.elevation);
  const gradient = before !== null && after !== null && to > from ? ((after - before) / (to - from)) * 100 : null;
  return { distance, elevation, pressure, gradient };
}

function formatResolution(meters: number): string {
  return meters < 10 ? `${Math.max(1, Math.round(meters))} m` : `${Math.round(meters / 5) * 5} m`;
}
