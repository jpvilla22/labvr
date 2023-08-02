import * as THREE from 'three';
import { Solution } from './Solution';
import { PetriDish } from './objects/PetriDish';
import { ExperimentData } from './ExperimentData';
import { ResultsScreenGenerator } from './utils/ResultsScreenGenerator';
import { StirringStove } from './objects/StirringStove';
import { ExperimentResults } from './server/handlers/experimentResults';

export type PetriState = {
  spread: boolean;
  solution?: Solution;
  label: string;
  hour: number;
  coloniesCount?: number;
};

export type HourEntry = {
  hour: number;
  sampleDO: number; // Sample optic density
  petrisStates: PetriState[];
};

export type ChosenEntry = {
  hour: number;
  count0?: number;
  count1?: number;
  concentration0?: number;
  concentration1?: number;
};

export namespace RecordingSheet {
  const entries: HourEntry[] = [];
  const chosenPetris: ChosenEntry[] = [{ hour: 0 }, { hour: 1 }, { hour: 2 }];
  const chosenDOs: number[] = new Array(3);

  export let temperature: number = StirringStove.START_TEMPERATURE;
  export let currentHour: number = 0;

  export function getEntries() {
    return JSON.parse(JSON.stringify(entries));
  }

  export function setCurrentSampleDO(value: number) {
    setSampleDO(currentHour, value);
  }

  export function setCurrentPetris(petris: PetriDish[]) {
    this.setPetris(currentHour, petris);
  }

  export function setSampleDO(hour: number, value: number) {
    getEntry(hour).sampleDO = value;
  }

  export function setChosen(hour: number, petri: PetriDish, slot: number) {
    const count = petri.isSpread ? petri.colonies : undefined;
    const concentration = petri.cultureConcentration;

    chosenPetris[hour][slot == 0 ? 'count0' : 'count1'] = count;
    chosenPetris[hour][slot == 0 ? 'concentration0' : 'concentration1'] = concentration;
    chosenDOs[hour] = getEntry(hour).sampleDO;
  }

  export function clearChosen(hour: number, slot: number) {
    if (slot == 0) chosenPetris[hour].count0 = chosenPetris[hour].concentration0 = undefined;
    else chosenPetris[hour].count1 = chosenPetris[hour].concentration1 = undefined;

    chosenDOs[hour] = undefined;
  }

  export function setPetris(hour: number, petris: PetriDish[]) {
    getEntry(hour).petrisStates = petris.map((petri) => {
      if (petri.solution?.type == 'cultivo') {
        const concentration = petri.solution.concentration;
        var coloniesCount = ExperimentData.getColoniesCount(temperature, hour, concentration);
      }

      return {
        spread: petri.isSpread,
        solution: petri.solution?.clone(),
        label: petri.label,
        hour,
        temperature,
        coloniesCount,
      };
    });
  }

  export function clear() {
    entries.length = 0;
    chosenPetris.length = 0;
    chosenPetris.push({ hour: 0 }, { hour: 1 }, { hour: 2 });
    chosenDOs.length = 0;
    chosenDOs.length = 3;
  }

  export function getEntry(hour: number): HourEntry {
    let entry: HourEntry = entries.find((entry) => entry.hour == hour);

    if (!entry) {
      entry = { hour, sampleDO: null, petrisStates: [] };
      entries.push(entry);
    }

    return entry;
  }

  export function buildResults() {
    const results: ExperimentResults = { viables: [], totals: [], temperature };
    const ufcPoints = ExperimentData.getUFCPoints(temperature);
    const doPoints = ExperimentData.getDOPoints(temperature);

    for (let hour = 0; hour < 3; hour++) {
      const entry = getEntry(hour);
      const petris = entry.petrisStates.filter((state) => state.solution?.concentration == 10 ** -5);
      const ufc = ufcPoints.find((point) => point.x == hour).y;

      results.viables.push({
        hour,
        count1: petris[0]?.coloniesCount,
        count2: petris[1]?.coloniesCount,
        dilution: 10 ** -5,
        ufc,
        logufc: Math.log10(ufc),
      });

      results.totals.push({ hour, do: entry.sampleDO });
    }

    for (let hour = 3; hour < ufcPoints.length; hour++) {
      let dilution = 10 ** -5;
      let count1 = ExperimentData.getColoniesCount(temperature, hour, dilution);
      let count2 = ExperimentData.getColoniesCount(temperature, hour, dilution);

      if (count1 > 300) {
        dilution = 10 ** -6;
        count1 = ExperimentData.getColoniesCount(temperature, hour, dilution);
        count2 = ExperimentData.getColoniesCount(temperature, hour, dilution);
      }

      const ufc = ufcPoints.find((point) => point.x == hour).y;
      results.viables.push({
        hour,
        count1,
        count2,
        dilution,
        ufc,
        logufc: Math.log10(ufc),
      });

      const doValue = doPoints.find((point) => point.x == hour).y;
      results.totals.push({ hour, do: doValue });
    }

    return results;
  }

  export function generateEmptyTexture(): THREE.CanvasTexture {
    const emptySeries = { points: [] as any, title: '' };
    const texture = ResultsScreenGenerator.generate([], emptySeries, emptySeries, emptySeries, emptySeries);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, -1);
    return texture;
  }

  export function generateTexture(): THREE.CanvasTexture {
    const counts: number[] = new Array(3);

    chosenPetris.forEach((entry) => {
      if (entry.count0 && entry.count1) {
        const areSameConcentration = entry.concentration0 == entry.concentration1;
        counts[entry.hour] = areSameConcentration ? (entry.count0 + entry.count1) / 2 : undefined;
      } else if (entry.count0 || entry.count1) {
        counts[entry.hour] = (entry.count0 || 0) + (entry.count1 || 0);
      }
    });

    const ufcPoints = ExperimentData.getUFCPoints(temperature);
    const logUFCPoints = ufcPoints.map((point) => ({ x: point.x, y: Math.log10(point.y) }));

    const experimentLogUFCPoints = counts.map((count, hour) => {
      const entry = chosenPetris[hour];
      const areDiffConcentration =
        entry.concentration0 && entry.concentration1 && entry.concentration0 != entry.concentration1;

      if (areDiffConcentration || count == undefined || count > 300) {
        return { x: hour, y: undefined };
      } else {
        const noConcentration = !entry.concentration0 && !entry.concentration1;
        if (noConcentration) {
          return { x: hour, y: undefined };
        } else {
          const concentration = entry.concentration0 || entry.concentration1;
          const y = Math.log10((count * 10) / concentration);
          return { x: hour, y };
        }
      }
    });

    const doPointsTheory = ExperimentData.getDOPoints(temperature);
    const doPointsExperiment = counts.map((_, hour) => {
      const y = chosenDOs[hour];
      return { x: hour, y };
    });

    const ufcTheorySeries = { points: logUFCPoints, title: '' };
    const ufcExperimentSeries = { points: experimentLogUFCPoints, title: '' };
    const doSeriesTheory = { points: doPointsTheory, title: '' };
    const doSeriesExperiment = { points: doPointsExperiment, title: '' };

    const texture = ResultsScreenGenerator.generate(
      counts,
      ufcTheorySeries,
      ufcExperimentSeries,
      doSeriesTheory,
      doSeriesExperiment,
      true
    );
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, -1);
    return texture;
  }

  // "Private" functions

  (window as any).recordDebug = generateFakeRecord;
  function generateFakeRecord() {
    console.log('Generating fake record');

    for (let hour = 0; hour < 4; hour++) {
      var states: PetriState[] = [];
      for (let i = 0; i < 6; i++) {
        const concentrationExp = -Math.floor(i / 2) - 4;
        const concentration = 10 ** concentrationExp;
        let solution = new Solution('cultivo', concentration);
        let coloniesCount = ExperimentData.getColoniesCount(37, hour, concentration);

        if (i == 2 && Math.random() > 0.9) {
          solution = new Solution('mezcla', -5);
          coloniesCount = undefined;
        }

        states.push({
          spread: true,
          solution,
          label: `t${hour} ${concentrationExp}`,
          hour,
          coloniesCount,
        });
      }

      entries[hour] = {
        hour,
        sampleDO: ExperimentData.getOpticDensity(37, hour),
        petrisStates: states,
      };
    }
  }
}
