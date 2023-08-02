import * as THREE from 'three';

import { ChartGenerator } from '../../src/utils/ChartGenerator';

export type DataXY = {
  x: number;
  y: number;
};

export type DataSerie = {
  title: string;
  points: DataXY[];
};

export type ThreeHoursCount = number[];

function getTable(data: number[]): ImageData {
  //https://github.com/el/canvas-table

  const WIDTH = 512;
  const HEIGHT = 128;
  let canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  let ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = '15px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'black';

  const CELL_WIDTH = 150;
  const CELL_HEIGHT = 40;

  let x = Math.floor((WIDTH - CELL_WIDTH * 3) / 2);

  for (let i = 0; i <= 2; i++) {
    const value = typeof data[i] == 'number' ? (data[i] > 300 ? '>300' : data[i]) : '-';

    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(x, 0, CELL_WIDTH - 2, CELL_HEIGHT);
    ctx.fillStyle = 'black';
    ctx.fillText('Hora ' + i + ': ' + value, x + Math.floor(CELL_WIDTH / 2), 25);

    x = x + CELL_WIDTH + 2;
  }

  var imageData = canvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT);
  return imageData;
}

export class ResultsScreenGenerator {
  static generate(
    counts: ThreeHoursCount,
    viablesCurveDataSerieTheory: DataSerie,
    viablesCurveDataSerieExperiment: DataSerie,
    doDataTheory: DataSerie,
    doDataExperiment: DataSerie,
    showFinishButton: boolean = false
  ) {
    let W = 1024;
    let H = 512;

    let largeCanvas = document.createElement('canvas') as HTMLCanvasElement;
    largeCanvas.width = W;
    largeCanvas.height = H;
    largeCanvas.style.visibility = 'hidden';
    var ctx = largeCanvas.getContext('2d');

    // Add border
    const borderSize = 5;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, largeCanvas.width, largeCanvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(borderSize, borderSize, largeCanvas.width - borderSize * 2, largeCanvas.height - borderSize * 2);

    //ctx.fillStyle = 'pink';
    //ctx.fillRect(0, 0, 1024, 2048);

    ctx.font = '25px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText('Resultados obtenidos', largeCanvas.width / 2, 40);

    //let diffuseMap = ChartGenerator.generate(data, 'curva de crecimiento', 'tiempo (h)', ' DO 660nm');
    let imageData1 = getTable(counts);

    let imageData2 = ChartGenerator.generate({
      dp1: viablesCurveDataSerieTheory.points,
      dp2: viablesCurveDataSerieExperiment.points,
      title: 'Curva de crecimiento de viables - logUCF/ml = f(t)',
      xLabel: 'Tiempo (h)',
      yLabel: ' logUCF/ml',
      serie1Label: 'Teórica',
      serie2Label: 'Medición',
      minY: 7,
      minX: 0,
      maxY: 9.5,
      maxX: 12,
    });

    let imageData3 = ChartGenerator.generate({
      dp1: doDataTheory.points,
      dp2: doDataExperiment.points,
      title: 'Curva de crecimiento de totales - DO = f(t)',
      xLabel: 'Tiempo (h)',
      yLabel: ' DO (660nm)',
      serie1Label: 'Teórica',
      serie2Label: 'Medición',
      minX: 0,
      maxX: 12,
      minY: 0,
      maxY: 1,
    });

    ctx.putImageData(imageData1, Math.floor(W / 2 - 512 / 2), Math.floor(H * 0.15));
    ctx.putImageData(imageData2, borderSize, Math.floor(H * 0.25));
    ctx.putImageData(imageData3, Math.floor(W / 2), Math.floor(H * 0.25));

    if (showFinishButton) {
      let x0 = largeCanvas.width / 2;
      let y0 = largeCanvas.height - 30;

      ctx.fillStyle = '#0099FF';
      //ctx.fillRect(x0 - 100, y0 - 20, 200, 30);

      ctx.beginPath();
      ctx.roundRect(x0 - 80, y0 - 20, 160, 30, 10);
      ctx.fill();

      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.fillText('Enviar resultados', largeCanvas.width / 2, y0);
    }

    let diffuseMap = new THREE.CanvasTexture(largeCanvas);
    diffuseMap.repeat.set(1, 1);
    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;

    return diffuseMap;
  }
}
