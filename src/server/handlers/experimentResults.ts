import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { config } from '../setup';

export type ExperimentResults = {
  temperature: number;
  viables: {
    hour: number;
    count1: number;
    count2: number;
    dilution: number;
    ufc: number;
    logufc: number;
  }[];
  totals: {
    hour: number;
    do: number;
  }[];
};

function buildCSV(results: ExperimentResults): string {
  const csv: Array<Array<any>> = [
    ['RECUENTO DE VIABLES'],
    ['TIEMPO', 'COLONIAS CONTADAS', '', 'DILUCIÓN', 'UFC/ml', 'log UFC/ml'],
  ];

  results.viables.forEach((entry) => {
    const { hour, count1 = '-', count2 = '-', dilution, ufc, logufc } = entry;
    csv.push([hour, count1, count2, dilution, ufc, logufc]);
  });

  csv.push([]);
  csv.push(['RECUENTO TOTALES']);
  csv.push(['TIEMPO (h)', 'DO 660nm']);

  results.totals.forEach((entry) => {
    const { hour, do: doValue = '-' } = entry;
    csv.push([hour, doValue]);
  });

  return csv.map((row) => row.join(',')).join('\n');
}

export function experimentResults(req: Request, res: Response) {
  const json = req.body;
  const id = json.id;

  console.log(id);

  // Write csv
  const csvFilename = config.csvFilename.replace('[id]', id);
  const csvFilepath = path.join(config.directory, csvFilename);
  fs.writeFileSync(csvFilepath, buildCSV(json.results));

  res.send(JSON.stringify({ success: true }));
}
