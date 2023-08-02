import * as THREE from 'three';
import { AxesHelper, BufferGeometryUtils } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MaterialLibrary, TextMapTypes as TextMapTypes } from '../../src/materials/MaterialLibrary';

(window as any).THREE = THREE;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let controls: OrbitControls;
let matlib: MaterialLibrary;

function onWindowResize() {
  //  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(600, 600);
}

function render() {
  renderer.render(scene, camera);
}

function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.LinearToneMapping;

  document.getElementById('container3D').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x555555);
  let width = 1;
  let height = 1;
  camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(0, 5, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  //controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();

  matlib = new MaterialLibrary(renderer);
  matlib.init().then(() => {
    renderer.setAnimationLoop(render);
  });
}

function addPlaneWithTexture() {
  //const texture = matlib.generateTextMap('1.3456', 'SPMDisplay' as TextMapTypes);
  //const texture = matlib.generateTextMap('37º', 'StoveDisplay' as TextMapTypes);
  //const texture = matlib.generateTextMap('16:25', 'Clock' as TextMapTypes);
  const texture = matlib.generateTextMap('t0-4', 'TubeLabel' as TextMapTypes);
  texture.flipY = false;
  //const texture = matlib.generateTextMap('-2A', 'PetriCapLabel' as TextMapTypes);

  let aspect = texture.image.width / texture.image.height;
  //texture.offset.y = 0.2;

  const boxGeom = new THREE.PlaneGeometry(1, 1 / aspect);
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const plane = new THREE.Mesh(boxGeom, mat);

  scene.add(plane);
}

window.addEventListener('load', (e) => {
  document.fonts.ready.then(() => {
    setup();
    addPlaneWithTexture();
  });
});
