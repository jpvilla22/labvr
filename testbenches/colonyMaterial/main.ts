import * as THREE from 'three';
import { AxesHelper, BufferGeometryUtils } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { info } from '../../src/utils/logger';
import Chart from 'chart.js/auto';
import { ChartGenerator } from '../../src/utils/ChartGenerator';
import { ResultsScreenGenerator, DataXY, DataSerie, ThreeHoursCount } from '../../src/utils/ResultsScreenGenerator';
import { MaterialLibrary, TextMapTypes as TextMapTypes } from '../../src/materials/MaterialLibrary';

(window as any).THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let material: THREE.MeshBasicMaterial;
let canvas: HTMLCanvasElement;
let matlib: MaterialLibrary;

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

  matlib = new MaterialLibrary(renderer);
  matlib.init().then(() => {
    renderer.setAnimationLoop(render);
    drawResults();
  });
}

function render() {
  renderer.render(scene, camera);
}

function drawResults() {
  let mat = matlib.createColonyMaterial(5000, true);
  material.map = mat.map;

  material.needsUpdate = true;

  material = mat;
}

setup();
