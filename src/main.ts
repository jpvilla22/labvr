/*

This document explains the portion of the WebXR APIs for managing input across the range of XR hardware
https://immersive-web.github.io/webxr/input-explainer

*/

import './style.css';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import StatsVR from 'statsvr'; // https://github.com/Sean-Bradley/StatsVR
import { SceneManager } from './SceneManager';
import { HandController } from './xr/HandController';
import { HTMLLogger } from './utils/logger';
import { MaterialLibrary } from './materials/MaterialLibrary';
import { LabObjectsFactory } from './objects/LabObjectsFactory';
import { AnchorsFactory } from './anchor/AnchorsFactory';
import { RecordingSheet } from './RecordingSheet';
import { Clock } from './utils/Clock';
import { Solution } from './Solution';
import { PetriDish } from './objects/PetriDish';
import { TestTube } from './objects/TestTube';
import { reproduceAudio } from './utils/audio';
import { ActivityLog } from './ActivityLog';

const w = window as any; // Mainly used for debugging

let sessionId: string = '';

w.THREE = THREE;
w.factory = LabObjectsFactory;
w.AnchorsFactory = AnchorsFactory;
w.recordings = RecordingSheet;
w.MaterialLibrary = MaterialLibrary;
w.ActivityLog = ActivityLog;

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera1: THREE.PerspectiveCamera;
let camera2: THREE.PerspectiveCamera;

let sceneManager: SceneManager;

let orbitControls: OrbitControls;
let pointerLockControls: PointerLockControls;

let loaderElement: HTMLElement;
let statsVR: StatsVR;

let handController0: HandController;
let handController1: HandController;
let materialLibrary: MaterialLibrary;

let cameras: THREE.Camera[] = [];
let currentCamera: number = 0;

let pointerLockCamMotion = new THREE.Vector2();
let btnLock: any;

/*
Sobre Three.js y WebXR
https://codingxr.com/articles/getting-started-with-webxr-and-threejs/

button vr example
https://sbcode.net/threejs/buttonvr/

*/

// Debug functions

w.populateDishes = (spread = true) => {
  LabObjectsFactory.objects.petriDish?.forEach((dish: PetriDish, idx) => {
    const concentration = 10 ** (-Math.floor(idx / 2) - 4);
    dish.dropSolution(new Solution('cultivo', concentration, 1));
    if (spread) dish.spread();
  });
};

w.populateTubes = () => {
  const tubes = LabObjectsFactory.objects.tube as TestTube[];

  tubes.forEach((tube: TestTube, idx) => {
    const prevSolution = tubes[idx - 1]?.extractSolution(1) || new Solution('cultivo', 1, 1);
    tube.dropSolution(prevSolution);
    tube.shake();
  });
};

function setupThreejs() {
  // Make a renderer that fills the screen
  renderer = new THREE.WebGLRenderer({ antialias: true });
  w.renderer = renderer;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.xr.enabled = true;

  scene = new THREE.Scene();

  setupOrbitCam();
  setupPointerLockCam();

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code == 'KeyC') switchCamera();
  });

  document.getElementById('container3D').appendChild(renderer.domElement);

  loaderElement = document.getElementById('loader');

  window.addEventListener('resize', onWindowResize, false);
  onWindowResize();

  statsVR = new StatsVR(scene, camera1);
  materialLibrary = new MaterialLibrary(renderer);
  sceneManager = new SceneManager(scene, materialLibrary);

  w.sceneManager = sceneManager;
  sceneManager.onProgress(() => {
    const megabytes = Number(sceneManager.mbLoaded).toFixed(2);
    loaderElement.innerHTML = `${megabytes} MB loaded`;
  });

  // Rendered logger
  w.htmlLog = HTMLLogger.log.bind(HTMLLogger);
}

function setupOrbitCam() {
  camera1 = new THREE.PerspectiveCamera(50, undefined, 0.01, 100);
  camera1.position.set(-3, 2, 3);
  orbitControls = new OrbitControls(camera1, renderer.domElement);
  orbitControls.target.y = 1.5;
  orbitControls.update();
  scene.add(camera1);
  cameras[0] = camera1;
}

function setupPointerLockCam() {
  btnLock = document.getElementById('btnLock');

  camera2 = new THREE.PerspectiveCamera(60, undefined, 0.01, 100);
  camera2.position.y = 1.5;
  camera2.position.z = 1;
  pointerLockControls = new PointerLockControls(camera2, document.body);
  pointerLockControls.addEventListener('lock', function () {
    btnLock.style.display = 'none';
  });

  pointerLockControls.addEventListener('unlock', function () {
    if (currentCamera == 1) btnLock.style.display = 'block';
  });
  scene.add(camera2);
  cameras[1] = camera2;

  btnLock.addEventListener('click', () => {
    pointerLockControls.lock();
  });

  const onKeyDown = function (event: KeyboardEvent) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        pointerLockCamMotion.y = 1;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        pointerLockCamMotion.x = -1;
        break;

      case 'ArrowDown':
      case 'KeyS':
        pointerLockCamMotion.y = -1;
        break;

      case 'ArrowRight':
      case 'KeyD':
        pointerLockCamMotion.x = 1;
        break;
    }
  };

  const onKeyUp = function (event: KeyboardEvent) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        pointerLockCamMotion.y = 0;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        pointerLockCamMotion.x = 0;
        break;

      case 'ArrowDown':
      case 'KeyS':
        pointerLockCamMotion.y = 0;
        break;

      case 'ArrowRight':
      case 'KeyD':
        pointerLockCamMotion.x = 0;
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function onWindowResize() {
  let aspect = window.innerWidth / window.innerHeight;
  camera1.aspect = aspect;
  camera1.updateProjectionMatrix();
  camera2.aspect = aspect;
  camera2.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupControllers() {
  handController0 = new HandController(renderer.xr, sceneManager);
  handController0.setup(0);

  handController1 = new HandController(renderer.xr, sceneManager);
  handController1.setup(1);
}

function animate() {
  Clock.start();
  renderer.setAnimationLoop(render);
}

function switchCamera() {
  if (currentCamera == 0) {
    currentCamera = 1;
    btnLock.style.display = 'block';
  } else {
    pointerLockControls.unlock();
    currentCamera = 0;
    btnLock.style.display = 'none';
  }
}

function render() {
  Clock.update();
  // statsVR.update();

  handController0?.update();
  handController1?.update();

  LabObjectsFactory.update();

  if (currentCamera == 1) {
    const delta = 0.025;

    pointerLockControls.moveRight(pointerLockCamMotion.x * delta);
    pointerLockControls.moveForward(pointerLockCamMotion.y * delta);
  }

  // Draw everything
  renderer.render(scene, cameras[currentCamera]);
}

function generateRandomKey() {
  var clave = '';
  var caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (var i = 0; i < 6; i++) {
    var indice = Math.floor(Math.random() * caracteres.length);
    clave += caracteres.charAt(indice);
  }

  return clave;
}

async function start() {
  ActivityLog.sessionId = sessionId = generateRandomKey();
  let infoDiv = document.getElementById('info');
  infoDiv.innerHTML = 'Session ID: ' + sessionId;
  setupThreejs();

  await materialLibrary.init();
  await sceneManager.loadModels();

  sceneManager.buildDebugGUI();

  renderer.xr.addEventListener('sessionstart', function (event: any) {
    setupControllers();
    reproduceAudio('welcome');
  });

  renderer.xr.addEventListener('sessionend', function (event: any) {});

  // Add a button to enter/exit vr to the page
  document.body.appendChild(VRButton.createButton(renderer));

  loaderElement.style.visibility = 'hidden';
  animate();
}

start();
