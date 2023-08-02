import * as THREE from 'three';
import { AxesHelper, BufferGeometryUtils } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { info } from '../../src/utils/logger';
import Chart from 'chart.js/auto';
import { ChartGenerator } from '../../src/utils/ChartGenerator';
import { ResultsScreenGenerator, DataXY, DataSerie, ThreeHoursCount } from '../../src/utils/ResultsScreenGenerator';

(window as any).THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let material: THREE.MeshBasicMaterial;
let canvas: HTMLCanvasElement;

function onWindowResize() {
  camera.aspect = 2;
  camera.updateProjectionMatrix();
  renderer.setSize(1500, 900);
}

function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.getElementById('container3D').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333344);
  camera = new THREE.PerspectiveCamera(50, undefined, 0.01, 100);
  camera.position.set(0, 0, 1.3);

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(0, 5, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  scene.add(new AxesHelper(1));
  const boxGeom = new THREE.PlaneGeometry(2, 1);

  material = new THREE.MeshBasicMaterial();
  const tv = new THREE.Mesh(boxGeom, material);
  scene.add(tv);

  controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();

  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}

function drawResults() {
  let counts: ThreeHoursCount = [44, 55, 218];

  let viables1 = {
    points: [
      { x: 0, y: 7.64 },
      { x: 1, y: 7.74 },
      { x: 2, y: 8.34 },
      { x: 3, y: 8.94 },
      { x: 4, y: 9.06 },
      { x: 5, y: 9.06 },
      { x: 6, y: 9.06 },
      { x: 7, y: 9.07 },
      { x: 8, y: 8.99 },
      { x: 9, y: 8.76 },
      { x: 10, y: 8.46 },
      { x: 11, y: 8.16 },
      { x: 12, y: 7.86 },
    ],
    title: 'serie1',
  };

  let viables2 = {
    points: [
      { x: 0, y: 5.9 },
      { x: 1, y: 6.9 },
      { x: 2, y: 7.8 },
    ],
    title: 'serie',
  };
  let totals = {
    points: [
      { x: 0, y: 0.056 },
      { x: 1, y: 0.061 },
      { x: 2, y: 0.166 },
      { x: 3, y: 0.587 },
      { x: 4, y: 0.775 },
      { x: 5, y: 0.776 },
      { x: 6, y: 0.779 },
      { x: 7, y: 0.782 },
      { x: 8, y: 0.661 },
      { x: 9, y: 0.404 },
      { x: 10, y: 0.215 },
      { x: 11, y: 0.12 },
      { x: 12, y: 0.073 },
    ],
    title: 'serie',
  };

  const empty = { points: [] as any, title: '' };

  let diffuseMap = ResultsScreenGenerator.generate(counts, viables1, viables2, totals, empty, true);

  material.map = diffuseMap;
  material.transparent = false;
  material.needsUpdate = true;
}

setup();
drawResults();
