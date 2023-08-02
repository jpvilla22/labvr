import Chart, { ChartData } from 'chart.js/auto';
import * as THREE from 'three';

export type DataPoint = { x: number; y: number };
export type DataPoints = DataPoint[];

export type GenerateOpts = {
  dp1: DataPoints;
  dp2?: DataPoints;
  title: string;
  xLabel: string;
  yLabel: string;
  serie1Label: string;
  serie2Label?: string;
  minY?: number;
  maxY?: number;
  minX?: number;
  maxX?: number;
};

const WIDTH = 512 - 10;
const HEIGHT = 350 - 10;

export class ChartGenerator {
  static generate(opts: GenerateOpts): ImageData {
    const {
      dp1,
      dp2,
      title,
      xLabel,
      yLabel,
      serie1Label,
      serie2Label = '',
      minY = undefined,
      maxY = undefined,
      minX = undefined,
      maxX = undefined,
    } = opts;

    // it is neccesary to have a canvas container so that chart.js can inherit the resolution
    // of the container. It does ignore the width & height of the canvas

    let canvasContainer = document.createElement('div') as HTMLElement;
    canvasContainer.style.visibility = 'hidden';

    canvasContainer.style.width = +WIDTH + 'px';
    canvasContainer.style.height = HEIGHT + 'px';

    let canvas = document.createElement('canvas') as HTMLCanvasElement;
    //this.canvas.classList.add('mychart');
    //this.canvas.id = 'chart1';
    canvasContainer.appendChild(canvas);
    // the canvasContainer should be added to the document in order for chart.js to work
    document.body.appendChild(canvasContainer);

    const plugin = {
      id: 'customCanvasBackgroundColor',
      beforeDraw: (chart: any, args: any, options: any) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || '#FFFFFF';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      },
    };

    const data: ChartData = {
      datasets: [],
    };

    data.datasets.push({
      label: serie1Label,
      data: [],
      backgroundColor: 'rgba(0, 128, 255, 1)', // color de la linea
      borderColor: 'rgba(0, 128, 255, 1)',
      pointRadius: 7,
      order: 2,
    });
    dp1.forEach((v, i) => {
      data.datasets[0].data.push(v);
    });

    if (dp2) {
      data.datasets.push({
        label: serie2Label,
        data: [],
        backgroundColor: 'rgba(255, 128, 0, 1)', // color de la linea
        borderColor: 'rgba(255, 128, 0, 1)',
        pointRadius: 7,
        order: 1,
      });
      dp2.forEach((v, i) => {
        data.datasets[1].data.push(v);
      });
    }

    // https://www.chartjs.org/docs/latest/configuration/
    // https://www.chartjs.org/docs/latest/configuration/elements.html
    // https://www.chartjs.org/docs/latest/configuration/responsive.html

    Chart.defaults.devicePixelRatio = 1;

    //Chart.defaults.aspectRatio = 2;
    Chart.defaults.elements.point.radius = 2;
    Chart.defaults.elements.line.borderWidth = 3;
    Chart.defaults.layout.autoPadding = false;
    Chart.defaults.layout.padding = 15; // it is an internal padding between elements
    Chart.defaults.datasets.scatter.showLine = true;

    //const FONT_SIZE1 = 30;

    let chart = new Chart(canvas, {
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0,
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: minX,
            max: maxX,
            title: {
              display: true,
              text: xLabel,
            },
            border: {
              display: true,
              width: 5,
              color: '#000000',
            },
            grid: {
              color: '#999999',
              tickColor: 'grey',
              lineWidth: 3,
            },
            ticks: {
              font: {
                //size: FONT_SIZE1,
              },
            },
          },
          y: {
            type: 'linear',
            position: 'bottom',
            min: minY,
            max: maxY,
            title: {
              display: true,
              text: yLabel,
            },
            grid: {
              color: '#999999',
              tickColor: 'grey',
              lineWidth: 3,
            },
            border: {
              display: true,
              width: 4,
              color: '#000000',
            },
            ticks: {
              font: {
                //size: FONT_SIZE1,
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: title,
          },
        },
      },
      type: 'scatter',
      plugins: [plugin],
      data: data,
    });

    var imageData = canvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT);

    //let chartTx = new THREE.CanvasTexture(canvas);
    //console.log('image size: ' + chartTx.image.width + ' x ' + chartTx.image.height);
    //chartTx.magFilter = THREE.NearestFilter;
    //chartTx.minFilter = THREE.NearestFilter;
    //return chartTx;
    return imageData;
  }
}
