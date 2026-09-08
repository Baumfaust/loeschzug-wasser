import React from 'react';
import { type CalculationResult } from '../../types/water';

interface ElevationChartProps {
  result: CalculationResult;
  hoveredDistance: number | null;
  onHoverDistance: (distance: number | null) => void;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({ result, hoveredDistance, onHoverDistance }) => {
  if (result.segmentDetails.length === 0) return null;

  const profileSamples = result.profileSamples.length > 0
    ? result.profileSamples
    : result.segmentDetails.flatMap((segment, index) => [
        { distance: index === 0 ? 0 : result.segmentDetails[index - 1].accumulatedDistance, elevation: segment.elevationStart },
        { distance: segment.accumulatedDistance, elevation: segment.elevationEnd },
      ]);
  const chartSamples = smoothProfile(profileSamples);
  const elevations = chartSamples.map((sample) => sample.elevation);
  const actualMin = Math.min(...elevations);
  const actualMax = Math.max(...elevations);
  const actualRange = actualMax - actualMin;
  const scalePadding = Math.max(2, actualRange * 0.15);
  const minElev = Math.floor(actualMin - scalePadding);
  const maxElev = Math.ceil(actualMax + scalePadding);
  const elevRange = Math.max(maxElev - minElev, 4);

  const totalDist = result.mapDistance || 1;
  const width = 760;
  const height = 190;
  const padding = { top: 22, right: 20, bottom: 30, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = chartSamples.slice(1).map((sample, index) => {
    const previous = chartSamples[index];
    const x1 = padding.left + (previous.distance / totalDist) * chartWidth;
    const x2 = padding.left + (sample.distance / totalDist) * chartWidth;
    const y1 = padding.top + (1 - (previous.elevation - minElev) / elevRange) * chartHeight;
    const y2 = padding.top + (1 - (sample.elevation - minElev) / elevRange) * chartHeight;
    return { x1, x2, y1, y2, startDistance: previous.distance, distance: sample.distance - previous.distance, elevation: sample.elevation, index };
  });
  const hoveredIndex = hoveredDistance === null
    ? null
    : points.findIndex((point) => hoveredDistance <= point.startDistance + point.distance);
  const hoveredPoint = hoveredIndex === null || hoveredIndex < 0 ? null : points[hoveredIndex];
  const profilePath = createSmoothPath([{ x: points[0].x1, y: points[0].y1 }, ...points.map((point) => ({ x: point.x2, y: point.y2 }))]);
  const areaPath = `${profilePath} L ${points[points.length - 1].x2} ${height - padding.bottom} L ${points[0].x1} ${height - padding.bottom} Z`;

  return (
    <div className="absolute bottom-2 left-2 right-2 z-[1000] ml-0 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2 text-slate-100 shadow-2xl backdrop-blur-md sm:bottom-4 sm:left-96 sm:right-4 sm:ml-6 sm:p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
          <span>📈</span><span>Höhenprofil & Streckenverlauf</span>
        </h4>
        <span className="text-[10px] text-slate-400 font-mono">
          {Math.round(actualMin)}–{Math.round(actualMax)}m · Differenz {Math.round(actualRange)}m
          {hoveredPoint && ` · Höhe ${Math.round(hoveredPoint.elevation)}m`}
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36" role="img" aria-label="Höhenprofil">
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#475569" strokeWidth="1" />
          <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{Math.round(maxElev)}m</text>
          <text x={padding.left - 6} y={height - padding.bottom + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{Math.round(minElev)}m</text>
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" /><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#elevationGradient)" />
          <path d={profilePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {hoveredPoint && <line x1={hoveredPoint.x1} y1={hoveredPoint.y1} x2={hoveredPoint.x2} y2={hoveredPoint.y2} stroke="#facc15" strokeWidth="5" strokeLinecap="round" />}
          {result.pumpStations.map((pump) => {
            const pumpX = padding.left + (pump.distance / totalDist) * chartWidth;
            const pumpY = padding.top + (1 - (pump.elevation - minElev) / elevRange) * chartHeight;
            return <g key={pump.pumpIndex}><circle cx={pumpX} cy={pumpY} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" /><text x={pumpX} y={pumpY - 8} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">P{pump.pumpIndex}</text></g>;
          })}
          {points.map((point) => (
            <rect key={`hover-${point.index}`} x={point.x1} y={padding.top} width={Math.max(point.x2 - point.x1, 2)} height={chartHeight} fill="transparent"
              onMouseEnter={() => onHoverDistance(point.startDistance + point.distance / 2)} onMouseLeave={() => onHoverDistance(null)} />
          ))}
        </svg>
      </div>
    </div>
  );
};


function smoothProfile(samples: { distance: number; elevation: number }[]) {
  if (samples.length < 3) return samples;
  return samples.map((sample, index) => {
    const start = Math.max(0, index - 2);
    const end = Math.min(samples.length - 1, index + 2);
    const window = samples.slice(start, end + 1);
    return {
      distance: sample.distance,
      elevation: window.reduce((sum, point) => sum + point.elevation, 0) / window.length,
    };
  });
}

function createSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const midpoint = {
      x: (points[index].x + points[index + 1].x) / 2,
      y: (points[index].y + points[index + 1].y) / 2,
    };
    path += ` Q ${points[index].x} ${points[index].y} ${midpoint.x} ${midpoint.y}`;
  }
  const last = points[points.length - 1];
  path += ` Q ${last.x} ${last.y} ${last.x} ${last.y}`;
  return path;
}
