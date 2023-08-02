import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';
import { AnchorPoint } from '../anchor/AnchorPoint';
import { LabObject } from '../objects/LabObject';
import { LabObjectsFactory } from '../objects/LabObjectsFactory';
import { SceneManager } from '../SceneManager';
import { XRRemappedGamepad } from '../types/XRRemappedGamepad';
import { info } from '../utils/logger';
import { Handedness, XRGamepadMonitor, EventTypes as XRGamepadMonitorEvents } from './XRGamepadMonitor';
import { Clock } from '../utils/Clock';
import { Burner } from '../objects/Burner';
import { reproduceAudio } from '../utils/audio';
import { ContainerObject } from '../objects/ContainerObject';

type GrabbingType = {
  labObject: LabObject;
  state: 'grabbing' | 'grabbed' | 'releasing';
  transitionCurrentTime: number;
  transitionStep: number; // Units per frame
  parkingPosition: THREE.Vector3; // Destination once the object is dropped
  parkingRotation: THREE.Euler;
  prevMatrix: THREE.Matrix4;
  nearAnchor?: AnchorPoint;
  placeholder?: THREE.Object3D;
};

type HighlightedType = {
  labObject: LabObject;
  hitSurface: THREE.Object3D;
};

/*
https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API

*/
const VIEW_ROTATION_DELTA = Math.PI / 8;
const WALKING_SPEED_FACTOR = 0.5;
const SHOW_HIT_POINT = false;

export class HandController {
  handedness: Handedness;
  index: number;

  private static alarmTriggered: boolean = false;

  private xr: THREE.WebXRManager;
  private monitor: XRGamepadMonitor;
  private sceneManager: SceneManager;
  private controller: THREE.XRTargetRaySpace;
  private gamepad: XRRemappedGamepad;
  private baseReferenceSpace: XRReferenceSpace;

  // Temporal buffers
  private highlighted?: HighlightedType;
  private grabbing?: GrabbingType;
  private floorIntersection?: THREE.Vector3;
  private checkFloorIntersection: boolean = false;

  private viewerYRotation = 0;
  private viewerPosition = new THREE.Vector3(0, 0, 0);
  private holdingPoint = new THREE.Object3D();

  // Debug
  private debugHitPoint: THREE.Mesh;

  constructor(xr: THREE.WebXRManager, sceneMngr: SceneManager) {
    this.xr = xr;
    this.sceneManager = sceneMngr;
    this.grabbing = null;
  }

  get grabbingObject(): THREE.Object3D | null {
    return this.grabbing.labObject.object;
  }

  setup(index: number) {
    this.index = index;
    this.controller = this.xr.getController(index);
    this.baseReferenceSpace = this.xr.getReferenceSpace();

    this.controller.addEventListener('connected', this.onConnected.bind(this));
    this.controller.addEventListener('disconnected', this.onDisconnected.bind(this));

    this.sceneManager.scene.add(this.controller);

    // The XRControllerModelFactory will automatically fetch controller models that match what the user is holding as closely as possible
    const controllerModelFactory = new XRControllerModelFactory();
    let grip = this.xr.getControllerGrip(index);
    grip.add(controllerModelFactory.createControllerModel(grip));
    grip.add(this.holdingPoint);
    /*
    let ax = new THREE.AxesHelper(0.05);
    ax.visible = true;
    this.holdingPoint.add(ax);
*/
    //this.holdingPoint.rotation.set(0, -Math.PI / 2, 0);
    this.holdingPoint.position.z = -0.08;

    this.sceneManager.scene.add(grip);
    this.updateViewerTransform();
  }

  update() {
    // Check if connection has already finished
    if (!this.monitor) return;

    this.monitor.update();

    if (this.checkFloorIntersection) this.updateFloorIntersection();

    if (!this.grabbing) this.checkGrabbablesIntersection();
    this.updateGrabbedObject();

    if (this.handedness == 'right') this.updateWalk();

    if (!HandController.alarmTriggered) this.checkAlarm();
  }

  /** Execute haptic vibration */
  pulse(intensity: number, millis: number) {
    this.gamepad.hapticActuators?.[0].pulse(intensity, millis);
  }

  private testWalk() {
    let pos = new THREE.Vector2(10, 0);

    this.viewerYRotation += 0.01;
    this.viewerPosition.x = pos.x;
    this.viewerPosition.z = pos.y;

    this.updateViewerTransform();
  }

  private onConnected(event: THREE.Event & THREE.XRTargetRaySpace) {
    this.handedness = event.data.handedness;
    this.gamepad = event.data.gamepad;
    this.monitor = new XRGamepadMonitor(this.xr, this.handedness);

    info(`Connected ${this.handedness} controller`);

    // TODO: Add type to event
    this.monitor.addEventListener(XRGamepadMonitorEvents.ON_BUTTON_DOWN, (event: any) => {
      if (event.button == 'Grip') this.onGripDown();
      else if (event.button == 'Trigger') this.onSelectDown();
      else if (event.index == 4 || event.index == 5) this.onThumbButtonDown();
      else if (event.button == 'Joystick') this.onJoystickDown();
    });

    this.monitor.addEventListener(XRGamepadMonitorEvents.ON_BUTTON_UP, (event: any) => {
      if (event.button == 'Grip') this.onGripUp();
      else if (event.button == 'Trigger') this.onSelectUp();
    });

    if (this.handedness == 'right') {
      this.monitor.addEventListener(XRGamepadMonitorEvents.ON_AXIS_X_HOLDED, (event: any) => {
        console.log('ON_AXIS_X_HOLDED ' + event.value);

        let angle = event.value > 0 ? VIEW_ROTATION_DELTA : -VIEW_ROTATION_DELTA;

        this.viewerYRotation += angle;
        this.updateViewerTransform();
      });
    }

    this.controller.add(this.buildController(event.data));

    // Debug stuff
    if (SHOW_HIT_POINT) {
      this.debugHitPoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 4, 4),
        new THREE.MeshBasicMaterial({ color: this.handedness == 'left' ? 0x0088ee : 0xff6600 })
      );
      this.debugHitPoint.name = 'debugHitPoint';
      this.debugHitPoint.visible = false;
      this.sceneManager.scene.add(this.debugHitPoint);
    }
  }

  private onDisconnected(event: THREE.Event & THREE.XRTargetRaySpace) {
    info(`Disconnected ${this.handedness} controller`);
    this.controller.remove(this.controller.children[0]);
  }

  private onThumbButtonDown() {
    if (this.grabbing) this.grabbing.labObject.onThumbButtonDown();
  }

  private onSelectDown() {
    if (this.highlighted) {
      const { labObject, hitSurface } = this.highlighted;
      labObject.onTriggerDown(hitSurface);
    } else {
      this.checkFloorIntersection = true;
    }
  }

  private onJoystickDown() {
    if (this.grabbing) this.grabbing.labObject.onJoystickDown();
  }

  private onSelectUp() {
    if (this.floorIntersection && !this.highlighted) {
      this.teleport();
      this.floorIntersection = undefined;
      this.sceneManager.marker.visible = false;
    }

    this.checkFloorIntersection = false;
  }

  private onGripDown() {
    // If no object is highlighted or we are already grabbing something, return
    if (!this.highlighted || this.grabbing) return;

    const highlighted = this.highlighted.labObject;
    if (!highlighted.isInteractable) return;

    highlighted.onGripDown();

    if (!highlighted.grabbable) return;

    this.grabbing = {
      labObject: highlighted,
      state: 'grabbing',
      transitionCurrentTime: 0,
      transitionStep: 0.1,
      parkingPosition: highlighted.object.position.clone(),
      parkingRotation: highlighted.object.rotation.clone(),
      prevMatrix: highlighted.object.matrix.clone(),
      placeholder: highlighted.placeholder,
    };

    this.highlighted = undefined;

    this.grabbing.labObject.controller = this;
    this.grabbing.labObject.highlight(false);

    // We avoid grabbing the object with the other hand
    this.grabbing.labObject.interactionEnabled = false;
  }

  private onGripUp() {
    // Nothing to do if no object is being grabbed
    if (this.grabbing == null) return;

    const grabbed = this.grabbing.labObject;

    // Detach from controller
    const threeObj = grabbed.object;
    this.controller.remove(threeObj); // Detach from controller
    this.sceneManager.scene.add(threeObj); // Add again to scene
    let p = this.holdingPoint.getWorldPosition(new THREE.Vector3());
    threeObj.position.copy(p); // Set world position to controller's position

    // Restore original rotation
    const rotation = new THREE.Matrix4();
    rotation.extractRotation(this.grabbing.prevMatrix);
    threeObj.rotation.setFromRotationMatrix(rotation);

    // Check if object was dropped near an anchor point
    const { nearAnchor } = this.grabbing;
    if (nearAnchor) {
      this.grabbing.parkingPosition.copy(grabbed.getAnchoredPosition(nearAnchor));
      this.grabbing.parkingRotation.copy(grabbed.getAnchoredRotation(nearAnchor));
    }

    if (this.grabbing.placeholder) this.grabbing.placeholder.visible = false;

    // Update the grabbing status
    this.grabbing.state = 'releasing';
    this.grabbing.transitionCurrentTime = 0;
    this.grabbing.transitionStep = 0.08;

    this.grabbing.labObject.controller = undefined;

    grabbed.onDropped();
  }

  private updateFloorIntersection() {
    const { floor, marker, walkingArea } = this.sceneManager;
    this.floorIntersection = undefined;

    const intersection = this.getRayControllerIntersections([floor]);

    if (intersection) {
      intersection.y = walkingArea.max.y;
      if (walkingArea.containsPoint(intersection)) {
        this.floorIntersection = intersection.clone();
        marker.position.copy(this.floorIntersection);
      }
    }

    marker.visible = !!this.floorIntersection;
  }

  /** Check if any grabbable object is touched by the ray of the controller */
  private checkGrabbablesIntersection() {
    if (this.highlighted) {
      this.highlighted.labObject.highlight(false);
      this.highlighted = undefined;
    }

    const raycaster = new THREE.Raycaster();
    const ray = this.getControllerRay();
    raycaster.ray.origin = ray.origin;
    raycaster.ray.direction = ray.direction;

    // Get all objects that intersect
    const intersections = LabObjectsFactory.interactables()
      .map((labObject: LabObject) => labObject.rayIntersection(raycaster))
      .filter((intersection) => intersection);

    // Get the closest one
    const closest = intersections.sort((a, b) => {
      const aDist = a.point.distanceToSquared(this.viewerPosition);
      const bDist = b.point.distanceToSquared(this.viewerPosition);
      return aDist - bDist;
    })[0];

    if (closest) {
      this.highlighted = {
        labObject: closest.labObject,
        hitSurface: closest.hitSurface,
      };
      closest.labObject.highlight(true, closest.hitSurface);
    }

    if (SHOW_HIT_POINT) {
      this.debugHitPoint.position.copy(closest.point);
      this.debugHitPoint.visible = !!closest;
    }
  }

  /** Checks intersection between a controller's ray and a list of meshes
   * @returns Point where the ray intersects any objects' mesh, or undefined if there isn't any
   */
  private getRayControllerIntersections(objects: THREE.Object3D[]): THREE.Vector3 | undefined {
    const raycaster = new THREE.Raycaster();
    let intersection = undefined;

    let ray = this.getControllerRay();

    raycaster.ray.origin = ray.origin;
    raycaster.ray.direction = ray.direction;

    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
      intersection = intersects[0].point;
    }

    return intersection;
  }

  private getControllerRay() {
    const mat = new THREE.Matrix4();

    mat.identity().extractRotation(this.controller.matrixWorld);

    let ray = {
      origin: new THREE.Vector3().setFromMatrixPosition(this.controller.matrixWorld),
      direction: new THREE.Vector3().set(0, 0, -1).applyMatrix4(mat),
    };
    return ray;
  }

  /** Animates the object while is being grabbed or released */
  private updateGrabbedObject() {
    if (!this.grabbing) return;

    if (this.grabbing.state == 'grabbing') {
      this.updateGrabbingState();
    } else if (this.grabbing.state == 'releasing') {
      this.updateReleasingState();
    } else if (this.grabbing.state == 'grabbed') {
      this.updateGrabbedState();
    }
  }

  private updateGrabbingState() {
    const { labObject } = this.grabbing;
    const obj = this.grabbing.labObject.object;
    let objHPoint: THREE.Object3D = this.grabbing.labObject.holdingPoint;

    // Animate grabbed object towards controller

    let target = this.holdingPoint.getWorldPosition(new THREE.Vector3());
    let objHPointPos: THREE.Vector3 = objHPoint.getWorldPosition(new THREE.Vector3());

    // calculate the distance between the object Holding Point and the controller Holding Point
    let direction: THREE.Vector3 = target.clone();
    direction.sub(objHPointPos);

    let distanceToTarget = direction.length();
    direction.normalize();

    if (distanceToTarget >= this.grabbing.transitionStep) {
      // Need to travel at least 1 or more steps to reach destination
      direction.multiplyScalar(this.grabbing.transitionStep); // Maximum step per frame
      obj.position.add(direction);
    } else {
      // Reached destination
      direction.multiplyScalar(distanceToTarget);
      obj.position.add(direction);

      this.grabbing.state = 'grabbed';
      this.holdingPoint.attach(obj);

      // extract transform of object holding point to he object's coordinates system
      // objHPoint is like a camera. We want the transform from "camera" to object
      objHPoint.updateMatrixWorld();
      let m1 = objHPoint.matrix.clone();
      m1.invert();
      const position = new THREE.Vector3(); // create one and reuse it
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();

      m1.decompose(position, quaternion, scale);
      // set the obj transform so that holdingPoint matches the holding point of the controller
      obj.position.copy(position);
      obj.rotation.setFromQuaternion(quaternion);

      labObject.onGrabbed();
    }
  }

  private updateReleasingState() {
    const { labObject } = this.grabbing;
    const obj = this.grabbing.labObject.object;

    // Animate grabbed object towards destination
    let direction: THREE.Vector3 = this.grabbing.parkingPosition.clone();
    direction.sub(obj.position);

    if (direction.length() > this.grabbing.transitionStep) {
      direction.setLength(this.grabbing.transitionStep);
      obj.position.add(direction);
    } else {
      // Reached destination
      if (this.grabbing.nearAnchor) {
        // place on Anchor
        labObject.placeOnAnchor(this.grabbing.nearAnchor);
      } else {
        // place on parking location
        obj.position.copy(this.grabbing.parkingPosition);
        obj.rotation.copy(this.grabbing.parkingRotation);
      }
      labObject.interactionEnabled = true;
      this.grabbing = null;
      labObject.onReleased();
    }
  }

  private updateGrabbedState() {
    // Check for any near anchor point
    const grabbed = this.grabbing.labObject;
    const closest = grabbed.getClosestAnchor();

    if (closest) {
      // Set nearAnchor and update placeholder's position
      this.grabbing.nearAnchor = closest;
      const placeholderPos = closest.position.clone().sub(grabbed.basePosition);
      this.grabbing.placeholder?.position.copy(placeholderPos);
    } else {
      this.grabbing.nearAnchor = undefined;
    }

    if (this.grabbing.placeholder) this.grabbing.placeholder.visible = !!this.grabbing.nearAnchor;

    grabbed.whileGrabbed();
  }

  private checkAlarm() {
    if (!this.grabbing) return;

    const burner = LabObjectsFactory.objects.burner?.[0] as Burner;
    if (!burner) return;

    if (this.grabbing?.state != 'grabbed') return;

    const grabbed = this.grabbing.labObject as ContainerObject;
    if (!grabbed.isContainer) return;

    const triggerDistance = 2;
    if (grabbed.isOpened && grabbed.worldPosition.distanceTo(burner.worldPosition) > triggerDistance) {
      HandController.alarmTriggered = true;
      reproduceAudio('farFromBurner');
      setTimeout(() => (HandController.alarmTriggered = false), 5000);
    }
  }

  private updateWalk() {
    let stickPos = this.monitor.getStickPosition();
    if (this.handedness != 'right' || stickPos.y == 0) return;

    let frontDirAngle = this.viewerYRotation + Math.PI / 2;
    let rayDir = this.getControllerRay().direction;

    rayDir.y = 0;
    rayDir.normalize();

    if (rayDir.length() < Number.MIN_VALUE) return;

    // front axis in XZ plane
    let frontDir = new THREE.Vector3(-Math.cos(frontDirAngle), 0, -Math.sin(frontDirAngle));

    // right axis in XZ plane
    let rightDir = frontDir.clone().cross(new THREE.Vector3(0, 1, 0));

    let sign = rightDir.dot(rayDir) > 0 ? 1 : -1;

    // is the angle in XZ plane between frontDirection and rayDirection in radians
    let controllerOffsetAngle = frontDir.angleTo(rayDir) * sign;

    let translationStep = new THREE.Vector2(
      Math.cos(frontDirAngle + controllerOffsetAngle),
      Math.sin(frontDirAngle + controllerOffsetAngle)
    );
    translationStep.multiplyScalar(-stickPos.y * Clock.delta * WALKING_SPEED_FACTOR);

    this.viewerPosition.x += translationStep.x;
    this.viewerPosition.z += translationStep.y;

    this.updateViewerTransform();
  }

  private teleport() {
    this.viewerPosition.x = -this.floorIntersection.x;
    this.viewerPosition.y = -this.floorIntersection.y;
    this.viewerPosition.z = -this.floorIntersection.z;

    this.updateViewerTransform();
  }

  private updateViewerTransform() {
    let pos = this.viewerPosition.clone();

    // dado que internamente WebXR aplica primero M = MRotation * Mtranslate
    // la traslacion debe ser aplicada sobre el sistema de coordenadas rotado en Y
    // por eso es necesario aplicar esta transformacion
    // para que al rotar, el usuario rote sobre el lugar en el que esta parado y no alrededor del 0,0,0 del mundo
    let mRot = new THREE.Matrix4();
    mRot.makeRotationY(this.viewerYRotation);
    pos.applyMatrix4(mRot);

    const offsetPosition = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      w: 1,
    };

    const offsetRotation = new THREE.Quaternion();
    offsetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.viewerYRotation);

    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    const spaceOffset = this.baseReferenceSpace.getOffsetReferenceSpace(transform);

    //console.log("updateViewerTransform: pos:" + this.viewerPosition.x + "," + this.viewerPosition.z + " ang:" + this.viewerYRotation);
    this.xr.setReferenceSpace(spaceOffset);
  }

  private buildController(data: any) {
    let geometry, material;

    // See WebXR > Concepts > Targeting categories
    // https://immersive-web.github.io/webxr/input-explainer.html#concepts
    switch (data.targetRayMode) {
      // Pointers can be tracked separately from the viewer (e.g. Cculus touch controllers)
      case 'tracked-pointer':
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

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
}
