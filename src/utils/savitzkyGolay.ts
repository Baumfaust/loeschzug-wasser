export interface ElevationSample {
  distance: number;
  elevation: number;
}

const WINDOW_SIZE = 5;

/**
 * Smooths an elevation profile with a quadratic Savitzky-Golay filter.
 *
 * The fit uses the actual distance values rather than assuming evenly spaced
 * samples. This is important because route samples can contain waypoints and
 * manually positioned pump samples at irregular distances.
 */
export function smoothElevationProfile(samples: ElevationSample[]): ElevationSample[] {
  if (samples.length < 3) return samples.map((sample) => ({ ...sample }));

  return samples.map((sample, index) => {
    if (index === 0 || index === samples.length - 1) return { ...sample };

    const start = Math.max(0, index - Math.floor(WINDOW_SIZE / 2));
    const end = Math.min(samples.length, start + WINDOW_SIZE);
    const window = samples.slice(Math.max(0, end - WINDOW_SIZE), end);
    const smoothedElevation = quadraticFitAtCenter(window, sample.distance);

    if (!Number.isFinite(smoothedElevation)) return { ...sample };

    const localMin = Math.min(...window.map((point) => point.elevation));
    const localMax = Math.max(...window.map((point) => point.elevation));
    return {
      distance: sample.distance,
      elevation: Math.max(localMin, Math.min(localMax, smoothedElevation)),
    };
  });
}

function quadraticFitAtCenter(samples: ElevationSample[], centerDistance: number): number {
  const scale = Math.max(...samples.map((sample) => Math.abs(sample.distance - centerDistance)), 1);
  const sums = Array.from({ length: 9 }, () => 0);
  const rightHandSide = [0, 0, 0];

  for (const sample of samples) {
    const x = (sample.distance - centerDistance) / scale;
    const x2 = x * x;
    const terms = [1, x, x2];
    for (let row = 0; row < 3; row++) {
      rightHandSide[row] += terms[row] * sample.elevation;
      for (let column = 0; column < 3; column++) {
        sums[row * 3 + column] += terms[row] * terms[column];
      }
    }
  }

  const coefficients = solveThreeByThree(sums, rightHandSide);
  return coefficients?.[0] ?? Number.NaN;
}

function solveThreeByThree(matrix: number[], rightHandSide: number[]): [number, number, number] | null {
  const augmented = [
    [matrix[0], matrix[1], matrix[2], rightHandSide[0]],
    [matrix[3], matrix[4], matrix[5], rightHandSide[1]],
    [matrix[6], matrix[7], matrix[8], rightHandSide[2]],
  ];

  for (let column = 0; column < 3; column++) {
    let pivot = column;
    for (let row = column + 1; row < 3; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    for (let row = column + 1; row < 3; row++) {
      const factor = augmented[row][column] / augmented[column][column];
      for (let value = column; value <= 3; value++) augmented[row][value] -= factor * augmented[column][value];
    }
  }

  const solution = [0, 0, 0];
  for (let row = 2; row >= 0; row--) {
    solution[row] = (augmented[row][3] - augmented[row].slice(row + 1, 3).reduce((sum, value, index) => sum + value * solution[row + 1 + index], 0)) / augmented[row][row];
  }
  return solution as [number, number, number];
}
