type GrowthEntry = {
  ufc: number; // Per mililitre
  do: number; // Optic density, 600nm
};

const growthReference: { [temperature: number]: { [hour: number]: GrowthEntry } } = {
  37: {
    0: { ufc: 4.7e7, do: 0.056 },
    1: { ufc: 5.4e7, do: 0.061 },
    2: { ufc: 2.16e8, do: 0.166 },
    3: { ufc: 8.64e8, do: 0.587 },
    4: { ufc: 1.152e9, do: 0.775 },
    5: { ufc: 1.154e9, do: 0.776 },
    6: { ufc: 1.158e9, do: 0.779 },
    7: { ufc: 1.164e9, do: 0.782 },
    8: { ufc: 9.767e8, do: 0.661 },
    9: { ufc: 5.82e8, do: 0.404 },
    10: { ufc: 2.91e8, do: 0.215 },
    11: { ufc: 1.455e8, do: 0.12 },
    12: { ufc: 7.275e7, do: 0.073 },
  },
  18: {
    0: { ufc: 4.7e7, do: 0.056 },
    1: { ufc: 5.4e7, do: 0.061 },
    2: { ufc: 6.16e7, do: 0.065 },
    3: { ufc: 8.627e7, do: 0.082 },
    4: { ufc: 1.22e8, do: 0.105 },
    5: { ufc: 1.725e8, do: 0.138 },
    6: { ufc: 2.44e8, do: 0.184 },
    7: { ufc: 3.451e8, do: 0.25 },
    8: { ufc: 4.88e8, do: 0.343 },
    9: { ufc: 4.9e8, do: 0.344 },
    10: { ufc: 4.94e8, do: 0.347 },
    11: { ufc: 5.0e8, do: 0.351 },
    12: { ufc: 4.454e8, do: 0.315 },
  },
};

export namespace ExperimentData {
  export function getColoniesCount(temp: number, hour: number, concentration: number): number {
    const ufc = growthReference[temp][hour].ufc;
    const theoryCount = (ufc * concentration) / 10;

    // Add a random factor of +/- 5%
    const rand = (Math.random() - 0.5) * theoryCount * 0.05;
    return Math.round(theoryCount + rand); // Round this to avoid floating point problems
  }

  export function getOpticDensity(temp: number, hour: number): number {
    return growthReference[temp][hour].do;
  }

  /** Use this function to draw the UFC/ml graph */
  export function getUFCPoints(temp: number): { x: number; y: number }[] {
    const growthEntries: [string, GrowthEntry][] = Object.entries(growthReference[temp]);

    return growthEntries.map(([hour, values]) => ({ x: parseInt(hour), y: values.ufc }));
  }

  /** Use this function to draw the DO graph */
  export function getDOPoints(temp: number): { x: number; y: number }[] {
    const growthEntries: [string, GrowthEntry][] = Object.entries(growthReference[temp]);

    return growthEntries.map(([hour, values]) => ({ x: parseInt(hour), y: values.do }));
  }
}
