/*

This document explains the portion of the WebXR APIs for managing input across the range of XR hardware
https://immersive-web.github.io/webxr/input-explainer

*/

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { floorPowerOfTwo } from 'three/src/math/MathUtils';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { XRGamepadMonitor } from './XRGamepadMonitor';
import { EventTypes as XRGamepadMonitorEvents } from './XRGamepadMonitor';
import StatsVR from 'statsvr'; //https://github.com/Sean-Bradley/StatsVR
import { Object3D } from 'three';

let renderer: any;
let scene: any;
let camera: any;

let raycaster: any;
let controllers: any[] = [];

let marker: any, floor: any, baseReferenceSpace: any;

let FLOOR_INTERSECTION: any;
const tempMatrix = new THREE.Matrix4();

let controls: OrbitControls;

let loaderElement: any;
let statsVR: any;
let gamepad;

let frame = 0;

let squeeze = false;
let select = false;

let container3D: HTMLElement;
let leftMonitor: XRGamepadMonitor;
let rightMonitor: XRGamepadMonitor;

type grabStates = 'grabbing' | 'grabbed' | 'releasing';

let grabbedObject: {
  obj: Object3D;
  state: grabStates;
  transitionCurrentTime: number;
  transitionStep: number;
  parkingPosition: THREE.Vector3 | null;
} = {
  obj: null,
  state: 'grabbing',
  transitionCurrentTime: 0,
  transitionStep: 0,
  parkingPosition: null,
};

let highlightedObject: Object3D | null = null;

/*
Sobre Three.js y WebXR
https://codingxr.com/articles/getting-started-with-webxr-and-threejs/

button vr example
https://sbcode.net/threejs/buttonvr/

*/

let grabbableObjects: THREE.Object3D[] = [];

function setupThreejs() {
  // Make a renderer that fills the screen
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(-3, 2, 3);
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  document.getElementById('container3D').appendChild(renderer.domElement);

  loaderElement = document.getElementById('loader');

  window.addEventListener('resize', onWindowResize, false);

  //pass in an existing scene and camera
  statsVR = new StatsVR(scene, camera);
  //change default statsvr position
  statsVR.setX(0);
  statsVR.setY(0);
  statsVR.setZ(-2);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function buildScene() {
  // Make a new scene

  let markerGeo = new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2);
  markerGeo.translate(0, 0.1, 0);
  marker = new THREE.Mesh(
    markerGeo,
    new THREE.MeshBasicMaterial({ color: 0xff80ff })
  );
  scene.add(marker);
  raycaster = new THREE.Raycaster();

  // Add some lights
  var light = new THREE.DirectionalLight(0xffffff, 0.5);
  light.position.set(1, 1, 1).normalize();
  //scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // wireframe sphere background
  const geometry = new THREE.SphereGeometry(50, 64, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true,
  });
  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  const geometry2 = new THREE.PlaneGeometry(30, 30, 30, 30);
  const material2 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  const plane = new THREE.Mesh(geometry2, material2);
  plane.rotation.x = -Math.PI / 2;
  //scene.add(plane);

  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 20, 20).rotateX(-Math.PI / 2),
    new THREE.MeshPhongMaterial({
      color: 0x808080,
      transparent: true,
      opacity: 0.75,
    })
  );
  floor.position.y = -0.05;
  scene.add(floor);
}

function loadModels(): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    let loader = new GLTFLoader();
    loader.load(
      'public/labTestScene.glb',
      (gltf) => {
        resolve(gltf);
      },
      (xhr) => {
        // !!! no funciona xhr.total, da siempre 0

        loaderElement.innerHTML =
          Number(xhr.loaded / 1000000).toFixed(2) + ' MB loaded';
      },
      (error) => {
        reject(error);
      }
    );
  });
}

function onModelsLoaded(gltf: GLTF) {
  console.log('onModelsLoaded() ');

  let list = [];

  gltf.scene.traverse(function (child: THREE.Object3D) {
    //child.visible=false;

    //console.log(child.name);
    if (child.name.indexOf('hitSurface') > -1) {
      // no hay nombre repetidos en el GLB, por ejemplo hitSurface se renombra a hitSurface_1 _2 _3 ... etc
      child.visible = false;
      grabbableObjects.push(child);
    }
  });

  scene.add(gltf.scene);
}

function setupControllers() {
  function onSelectStart() {
    console.log('onSelectStart ' + this.userData.handedness);
    this.userData.isSelecting = true;
    select = true;
  }

  function onSelectEnd() {
    console.log('onSelectEnd ' + this.userData.handedness);
    this.userData.isSelecting = false;
    select = false;
    if (FLOOR_INTERSECTION) teleport();
  }

  function onSqueezeStart() {
    console.log('onSqueezeStart ' + this.userData.handedness);
    this.userData.isSqueezing = true;
    squeeze = true;
  }

  function onSqueezeEnd() {
    console.log('onSqueezeEnd ' + this.userData.handedness);
    this.userData.isSqueezing = false;
    squeeze = false;
  }

  function onConnected(event: any) {
    // add the line pointer to the controller


    console.log(event);
    //this.userData.handedness = event.data.handedness;
    //this.userData.gamepad = event.data.gamepad;
    this.add(buildController(event.data));
  }

  function onDisconnected() {
    this.remove(this.children[0]);
  }

  // We get the "controller" group which is a coordinate system to attach the pointer line
  // it is different from the controllerGrip

  for (let i = 0; i <= 1; i++) {
    let c = renderer.xr.getController(i);
    c.userData.number = i;
    // https://immersive-web.github.io/webxr/input-explainer.html#input-events
    // https://discourse.threejs.org/t/listening-to-xr-touchpad-or-thumbstick-motion-controller-events/17545
    // selectstart and selectend son eventos asociados al trigger o boton principal

    // trigger button
    c.addEventListener('selectstart', onSelectStart);
    c.addEventListener('selectend', onSelectEnd);

    // grab button
    c.addEventListener('squeezestart', onSqueezeStart);
    c.addEventListener('squeezeend', onSqueezeEnd);

    c.addEventListener('connected', onConnected);
    c.addEventListener('disconnected', onDisconnected);
    scene.add(c);

    controllers[i] = c;

    const controllerModelFactory = new XRControllerModelFactory();
    let cg = renderer.xr.getControllerGrip(i);
    // get controller grip and add the 3d model to it

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.
    cg.add(controllerModelFactory.createControllerModel(cg));
    scene.add(cg);

    renderer.before;
    leftMonitor = new XRGamepadMonitor(renderer.xr, 'left');
    rightMonitor = new XRGamepadMonitor(renderer.xr, 'right');

    leftMonitor.addEventListener(
      XRGamepadMonitorEvents.ON_BUTTON_DOWN,
      (e: any) => {
        //console.log(e)
      }
    );

    leftMonitor.addEventListener(
      XRGamepadMonitorEvents.ON_BUTTON_UP,
      (e: any) => {
        //console.log(e)
      }
    );

    rightMonitor.addEventListener(
      XRGamepadMonitorEvents.ON_BUTTON_DOWN,
      (e: any) => {
        if (e.button != 'Grip') return; // si no es el boton grip salgo

        if (highlightedObject && grabbedObject.obj == null) {
          // hay un objeto resaltado y no hay ningun agarrado

          let distance = controllers[1].position.distanceTo(
            highlightedObject.position
          );

          grabbedObject.obj = highlightedObject;
          grabbedObject.state = 'grabbing';
          grabbedObject.transitionCurrentTime = 0;
          grabbedObject.transitionStep = distance / 20; // units/frame
          grabbedObject.parkingPosition = highlightedObject.position.clone();
        }
      }
    );

    rightMonitor.addEventListener(
      XRGamepadMonitorEvents.ON_BUTTON_UP,
      (e: any) => {
        if (e.button != 'Grip') return;

        if (grabbedObject.obj != null) {
          // hay un objeto agarrado

          controllers[1].remove(grabbedObject.obj); // detach from controller
          scene.add(grabbedObject.obj); // add again to scene
          grabbedObject.obj.position.copy(controllers[1].position); // set world position to controller's position

          let distance = grabbedObject.obj.position.distanceTo(
            grabbedObject.parkingPosition
          );

          grabbedObject.state = 'releasing';
          grabbedObject.transitionCurrentTime = 0;
          grabbedObject.transitionStep = distance / 20; // units/frame
        }
      }
    );

    leftMonitor.addEventListener(
      XRGamepadMonitorEvents.ON_AXIS_CHANGED,
      (e: any) => {
        //console.log(e)
      }
    );
    rightMonitor.addEventListener(
      XRGamepadMonitorEvents.ON_AXIS_CHANGED,
      (e: any) => {
        //console.log(e)
      }
    );
  }
}

function buildController(data: any) {
  let geometry, material;

  // see WebXR / concepts / targeting categories
  // https://immersive-web.github.io/webxr/input-explainer.html#concepts
  switch (data.targetRayMode) {
    // pointers can be tracked separately from the viewer (example oculus touch controllers)
    case 'tracked-pointer':
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );

      material = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Line(geometry, material);

    // Gaze-based input sources do not have their own tracking mechanism and instead use the viewer’s head position for targeting.
    case 'gaze':
      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
      });
      return new THREE.Mesh(geometry, material);
  }
}

function testFloorIntersection() {
  FLOOR_INTERSECTION = undefined;

  // while the trigger is down

  if (controllers[0] && controllers[0].userData.isSelecting === true) {
    FLOOR_INTERSECTION = testRayControllerIntersections(controllers[0], [
      floor,
    ]);
  } else if (controllers[1] && controllers[1].userData.isSelecting === true) {
    FLOOR_INTERSECTION = testRayControllerIntersections(controllers[1], [
      floor,
    ]);
  }

  if (FLOOR_INTERSECTION) marker.position.copy(FLOOR_INTERSECTION);
  marker.visible = FLOOR_INTERSECTION !== undefined;
}

function testGrabbablesIntersection() {
  // check if any grabbable object is touched by the ray of the right controller
  // if it is, highlight it

  if (controllers.length < 2) return;

  highlightedObject = null;

  grabbableObjects.forEach((obj, i) => {
    let intersects = testRayControllerIntersections(controllers[1], [obj]);
    if (intersects != undefined) {
      obj.visible = true;
      highlightedObject = obj.parent;
    } else {
      obj.visible = false;
    }
  });
}

function testRayControllerIntersections(controller: any, objects: any[]) {
  // checks intersection between a controller's ray and a list of meshes
  let intersection = undefined;

  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = raycaster.intersectObjects(objects);

  if (intersects.length > 0) {
    intersection = intersects[0].point;
  }

  return intersection;
}

// transport to new position
function teleport() {
  const offsetPosition = {
    x: -FLOOR_INTERSECTION.x,
    y: -FLOOR_INTERSECTION.y,
    z: -FLOOR_INTERSECTION.z,
    w: 1,
  };
  const offsetRotation = new THREE.Quaternion();

  //offsetRotation.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);

  const transform = new XRRigidTransform(offsetPosition, offsetRotation);
  const teleportSpaceOffset =
    baseReferenceSpace.getOffsetReferenceSpace(transform);

  renderer.xr.setReferenceSpace(teleportSpaceOffset);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(time: any) {
  statsVR.update();

  if (leftMonitor) leftMonitor.update();
  if (rightMonitor) rightMonitor.update();

  updateGrabbedObject();
  testGrabbablesIntersection();
  testFloorIntersection();
  //statsVR.setCustom1('gObj:' + grabbedObject.state)
  //statsVR.setCustom2('sque:' + squeeze)

  frame++;
  // Draw everything
  renderer.render(scene, camera);
}

function updateGrabbedObject() {
  if (!grabbedObject.obj) return;




  let obj = grabbedObject.obj;
  let con = controllers[1]; // supongo que el 1 siempre es el derecho pero por ahi esta mal

  if (grabbedObject.state == 'grabbing') {
    // distance from object to controller
    let dir: THREE.Vector3 = con.position.clone();
    dir.sub(obj.position);

    if (dir.length() > grabbedObject.transitionStep) {
      // need to travel at least 1 or more steps to reach destination
      dir.normalize();
      dir.multiplyScalar(grabbedObject.transitionStep); //maximum step per frame
      obj.position.add(dir);
    } else {
      // reached destination
      grabbedObject.state = 'grabbed';
      con.attach(obj);
    }
  } else if (grabbedObject.state == 'releasing') {
    // distance from object to controller

    let dir: THREE.Vector3 = grabbedObject.parkingPosition.clone();
    dir.sub(obj.position);

    if (dir.length() > grabbedObject.transitionStep) {
      dir.normalize();
      dir.multiplyScalar(grabbedObject.transitionStep);
      obj.position.add(dir);
    } else {
      // reached destination
      obj.position.copy(grabbedObject.parkingPosition);
      grabbedObject.obj = null;
    }
  }
}

function start() {
  setupThreejs();
  loadModels()
    .then((gltf: GLTF) => {
      onModelsLoaded(gltf);
      buildScene();

      renderer.xr.addEventListener('sessionstart', function (event: any) {
        baseReferenceSpace = renderer.xr.getReferenceSpace();
        setupControllers();
      });

      renderer.xr.addEventListener('sessionend', function (event: any) { });

      // Add a button to enter/exit vr to the page
      document.body.appendChild(VRButton.createButton(renderer));

      loaderElement.style.visibility = 'hidden';
      animate();

    }).catch((error) => {
      console.error('Error al cargar modelo GLB:', error);
    });

}

start();
