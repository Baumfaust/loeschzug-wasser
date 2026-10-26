export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/** Axis range and ticks on 1/2/5 × 10ⁿ steps that cover [min, max] with about `count` intervals. */
export function niceScale(min: number, max: number, count = 4): NiceScale {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
  if (max < min) [min, max] = [max, min];
  if (max - min < 1e-9) {
    min -= 1;
    max += 1;
  }

  const rough = (max - min) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) * magnitude;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax + step / 2; tick += step) ticks.push(roundToStep(tick, step));
  return { min: niceMin, max: niceMax, step, ticks };
}

function roundToStep(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(value.toFixed(decimals));
}

const numberFormat = (fractionDigits: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

export function formatDistance(meters: number, fractionDigits = 1): string {
  return meters >= 1000 ? `${numberFormat(fractionDigits).format(meters / 1000)} km` : `${Math.round(meters)} m`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return numberFormat(fractionDigits).format(value);
}

/**
 * Reduces a dense line to at most two points per pixel column (its min and max),
 * so peaks and pump resets survive while long routes stay cheap to draw.
 */
export function decimateForWidth<T>(points: T[], width: number, x: (point: T) => number, y: (point: T) => number): T[] {
  if (points.length <= width * 2) return points;
  const kept: number[] = [];
  let column = Math.floor(x(points[0]));
  let minIndex = 0;
  let maxIndex = 0;
  const flush = () => {
    kept.push(Math.min(minIndex, maxIndex));
    if (minIndex !== maxIndex) kept.push(Math.max(minIndex, maxIndex));
  };
  for (let index = 1; index < points.length; index++) {
    const pointColumn = Math.floor(x(points[index]));
    if (pointColumn !== column) {
      flush();
      column = pointColumn;
      minIndex = index;
      maxIndex = index;
    } else {
      if (y(points[index]) < y(points[minIndex])) minIndex = index;
      if (y(points[index]) > y(points[maxIndex])) maxIndex = index;
    }
  }
  flush();
  if (kept[kept.length - 1] !== points.length - 1) kept.push(points.length - 1);
  return kept.map((index) => points[index]);
}
