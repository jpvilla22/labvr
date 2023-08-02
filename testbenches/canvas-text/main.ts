import * as THREE from 'three';
import { AxesHelper, BufferGeometryUtils } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { info } from '../../src/utils/logger';

(window as any).THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  renderer.render(scene, camera);
}

function setup() {
  const canvas = document.getElementById('logger') as HTMLCanvasElement;
  canvas.height = 600;
  canvas.width = 1200;

  const context = ((window as any).context = canvas.getContext('2d'));

  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'black';
  context.font = '20px Monospace';

  for (let i = 0; i < 50; i++) {
    context.fillText('line number ' + i, 10, 20 * i);
  }

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.getElementById('container3D').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333344);
  camera = new THREE.PerspectiveCamera(50, undefined, 0.01, 100);
  camera.position.set(0, 1, 5);

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(0, 5, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  scene.add(new AxesHelper(1));
  const boxGeom = new THREE.BoxGeometry(2, 1, 0.05);
  const texture = ((window as any).texture = new THREE.CanvasTexture(canvas));
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const tv = new THREE.Mesh(boxGeom, mat);
  scene.add(tv);

  controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();

  renderer.setAnimationLoop(render);
}

setup();
