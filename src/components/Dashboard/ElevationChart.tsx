import React from 'react';
import { type CalculationResult } from '../../types/water';

interface ElevationChartProps {
  result: CalculationResult;
  hoveredDistance: number | null;
  onHoverDistance: (distance: number | null) => void;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({ result, hoveredDistance, onHoverDistance }) => {
  if (result.segmentDetails.length === 0) return null;

  const elevations = result.segmentDetails.flatMap((segment) => [segment.elevationStart, segment.elevationEnd]);
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
  const points = result.segmentDetails.map((segment, index) => {
    const startDistance = segment.accumulatedDistance - segment.distance;
    const x1 = padding.left + (startDistance / totalDist) * chartWidth;
    const x2 = padding.left + (segment.accumulatedDistance / totalDist) * chartWidth;
    const y1 = padding.top + (1 - (segment.elevationStart - minElev) / elevRange) * chartHeight;
    const y2 = padding.top + (1 - (segment.elevationEnd - minElev) / elevRange) * chartHeight;
    return { x1, x2, y1, y2, startDistance, segment, index };
  });
  const hoveredIndex = hoveredDistance === null
    ? null
    : result.segmentDetails.findIndex((segment) => hoveredDistance <= segment.accumulatedDistance);
  const hoveredPoint = hoveredIndex === null || hoveredIndex < 0 ? null : points[hoveredIndex];
  const profilePath = `M ${points[0].x1} ${points[0].y1} ${points.map((point) => `L ${point.x2} ${point.y2}`).join(' ')}`;
  const areaPath = `${profilePath} L ${points[points.length - 1].x2} ${height - padding.bottom} L ${points[0].x1} ${height - padding.bottom} Z`;

  return (
    <div className="absolute bottom-4 left-96 right-4 ml-6 bg-slate-900/95 backdrop-blur-md text-slate-100 p-3 rounded-xl shadow-2xl border border-slate-700/80 z-[1000]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
          <span>📈</span><span>Höhenprofil & Streckenverlauf</span>
        </h4>
        <span className="text-[10px] text-slate-400 font-mono">
          {Math.round(actualMin)}–{Math.round(actualMax)}m · Differenz {Math.round(actualRange)}m
          {hoveredPoint && ` · Punkt ${hoveredPoint.index + 1}: ${Math.round(hoveredPoint.segment.elevationEnd)}m`}
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
          {points.map((point) => (
            <line key={`profile-${point.index}`} x1={point.x1} y1={point.y1} x2={point.x2} y2={point.y2}
              stroke={hoveredIndex === point.index ? '#facc15' : '#38bdf8'} strokeWidth={hoveredIndex === point.index ? 5 : 2.5} />
          ))}
          {result.pumpStations.map((pump) => {
            const pumpX = padding.left + (pump.distance / totalDist) * chartWidth;
            const pumpY = padding.top + (1 - (pump.elevation - minElev) / elevRange) * chartHeight;
            return <g key={pump.pumpIndex}><circle cx={pumpX} cy={pumpY} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" /><text x={pumpX} y={pumpY - 8} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">P{pump.pumpIndex}</text></g>;
          })}
          {points.map((point) => (
            <rect key={`hover-${point.index}`} x={point.x1} y={padding.top} width={Math.max(point.x2 - point.x1, 2)} height={chartHeight} fill="transparent"
              onMouseEnter={() => onHoverDistance(point.startDistance + point.segment.distance / 2)} onMouseLeave={() => onHoverDistance(null)} />
          ))}
        </svg>
      </div>
    </div>
  );
};
