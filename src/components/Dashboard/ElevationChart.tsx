import React from 'react';
import { type CalculationResult } from '../../types/water';

interface ElevationChartProps {
  result: CalculationResult;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({ result }) => {
  if (result.segmentDetails.length === 0) {
    return null;
  }

  // Calculate min and max elevation for SVG scaling
  const elevations = result.segmentDetails.flatMap(s => [s.elevationStart, s.elevationEnd]);
  const minElev = Math.min(...elevations, 0);
  const maxElev = Math.max(...elevations, 10);
  const elevRange = Math.max(maxElev - minElev, 10);

  const totalDist = result.mapDistance || 1;
  const width = 600;
  const height = 120;
  const padding = 30;

  // Build points for SVG polyline
  let accumulated = 0;
  const points = result.segmentDetails.map((seg) => {
    const x1 = padding + (accumulated / totalDist) * (width - 2 * padding);
    accumulated += seg.distance;
    const x2 = padding + (accumulated / totalDist) * (width - 2 * padding);
    
    const y1 = height - padding - ((seg.elevationStart - minElev) / elevRange) * (height - 2 * padding);
    const y2 = height - padding - ((seg.elevationEnd - minElev) / elevRange) * (height - 2 * padding);

    return { x1, y1, x2, y2, start: seg.elevationStart, end: seg.elevationEnd };
  });

  return (
    <div className="absolute bottom-4 left-96 right-4 ml-6 bg-slate-900/95 backdrop-blur-md text-slate-100 p-3 rounded-xl shadow-2xl border border-slate-700/80 z-[1000]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
          <span>📈</span>
          <span>Höhenprofil & Streckenverlauf</span>
        </h4>
        <span className="text-[10px] text-slate-400 font-mono">
          Max Höhe: {Math.round(maxElev)}m | Min Höhe: {Math.round(minElev)}m
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

          {/* Terrain Area Fill */}
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Draw terrain path */}
          <path
            d={`M ${padding} ${height - padding} ` + 
               points.map(p => `L ${p.x1} ${p.y1}`).join(' ') + 
               ` L ${points[points.length - 1]?.x2 || padding} ${points[points.length - 1]?.y2 || height - padding}` +
               ` L ${points[points.length - 1]?.x2 || padding} ${height - padding} Z`}
            fill="url(#elevationGradient)"
          />

          {/* Draw terrain line */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={p.x1}
              y1={p.y1}
              x2={p.x2}
              y2={p.y2}
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
          ))}

          {/* Draw pump station markers on the chart */}
          {result.pumpStations.map((pump) => {
            const pumpX = padding + (pump.distance / totalDist) * (width - 2 * padding);
            const pumpY = height - padding - ((pump.elevation - minElev) / elevRange) * (height - 2 * padding);
            return (
              <g key={pump.pumpIndex}>
                <circle cx={pumpX} cy={pumpY} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                <text x={pumpX} y={pumpY - 8} textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">
                  P{pump.pumpIndex}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
