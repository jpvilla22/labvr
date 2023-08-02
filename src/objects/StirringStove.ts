import * as THREE from 'three';
import { AnchorPoint } from '../anchor/AnchorPoint';
import { AnchorSurface } from '../anchor/AnchorSurface';
import { AnchorsFactory, STIRRING_ANCHOR } from '../anchor/AnchorsFactory';
import { Clock } from '../utils/Clock';
import { findObjectByPrefix, findObjectsBy } from '../utils/findObjectBy';
import { warn } from '../utils/logger';
import { polarVector } from '../utils/polarVector';
import { CompoundLabObject } from './CompoundLabObject';
import { OscillatorController, beep, intermitentBeep } from '../utils/audio';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { RecordingSheet } from '../RecordingSheet';

export class StirringStove extends CompoundLabObject {
  public static readonly START_TEMPERATURE = 37;
  private static readonly ALARM_SECONDS = 10;

  readonly grabbable: boolean = false;

  anchors: AnchorPoint[] = [];

  private isOn: boolean = false;
  private shelf: THREE.Object3D;
  private shelfInitPosition: THREE.Vector3;
  private anchorsInitPositions: THREE.Vector3[] = [];
  private door: THREE.Object3D;
  private doorState: 'closed' | 'opened' = 'closed';
  private switch: THREE.Object3D;
  private temperature: number;
  private displayMat: THREE.MeshStandardMaterial;
  private lastTimeOpened: number;
  private alarmController: OscillatorController;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.temperature = StirringStove.START_TEMPERATURE;

    this.door = this.getObjectByPrefix('door');
    this.switch = this.getObjectByPrefix('switch');
    this.displayMat = (this.getObjectByPrefix('display') as THREE.Mesh)?.material as THREE.MeshStandardMaterial;

    // Parse the anchors inside the stove
    this.shelf = this.getObjectByPrefix('shelf');
    this.shelfInitPosition = this.shelf.position.clone();
    const anchorObj = findObjectByPrefix(this.shelf, 'helper') as THREE.Mesh;
    this.anchors = AnchorSurface.create(anchorObj, STIRRING_ANCHOR, 0.2).anchorPoints;
    if (this.anchors.length == 0) warn('No anchors found for StirringStove');

    // Save the initial position of each lab object when placed inside the stove
    this.anchors.forEach((anchor, idx) => {
      this.anchorsInitPositions.push(new THREE.Vector3());
      anchor.onOccupupied(() => {
        this.anchorsInitPositions[idx].copy(anchor.labObject.worldPosition);
      });
    });

    this.populateHitSurfaces();
    this.populateHitSurfacesMats();

    this.updateDisplay();
  }

  onTriggerDown(hitSurface: THREE.Object3D): void {
    if (hitSurface.name.startsWith('hitSurfaceUpButton') && this.isOn) {
      beep('D5', 150);
      if (RecordingSheet.currentHour == 0) this.increaseTemperature();
    } else if (hitSurface.name.startsWith('hitSurfaceDownButton') && this.isOn) {
      beep('C5', 150);
      if (RecordingSheet.currentHour == 0) this.decreaseTemperature();
    } else if (hitSurface.name.startsWith('hitSurfaceSwitchButton')) {
      this.togglePower();
    } else if (hitSurface.name.match(/^hitSurface[^a-zA-Z]/)) {
      this.toggleDoor();
    }
  }

  enable() {
    super.enable();
    AnchorsFactory.enable(STIRRING_ANCHOR);
    RecordingSheet.temperature = this.temperature;
    this.close();
  }

  disable() {
    super.disable();
    this.close();
    AnchorsFactory.disable(STIRRING_ANCHOR);
  }

  togglePower(value = !this.isOn) {
    if (value == this.isOn) return;

    this.isOn = value;
    if (this.isOn) {
      this.switch.rotateX((-36 * Math.PI) / 180);
      if (this.doorState == 'opened') this.lastTimeOpened = Clock.elapsed;
    } else {
      this.switch.rotateX((36 * Math.PI) / 180);
      this.stopAlarm();
    }

    this.updateDisplay();
  }

  update() {
    if (!this.isOn) return;

    this.animate();
    this.checkAlarm();
  }

  toggleDoor(open = this.doorState != 'opened') {
    if (open) this.open();
    else this.close();
  }

  open() {
    if (this.doorState == 'opened') return;
    this.doorState = 'opened';
    this.door.rotateY(Math.PI / 2);

    if (this.isOn) this.lastTimeOpened = Clock.elapsed;
  }

  close() {
    if (this.doorState == 'closed') return;
    this.doorState = 'closed';
    this.door.rotateY(-Math.PI / 2);
    this.stopAlarm();
  }

  increaseTemperature() {
    if (this.temperature == 18) this.temperature = 37;
    this.updateDisplay();
  }

  decreaseTemperature() {
    if (this.temperature == 37) this.temperature = 18;
    this.updateDisplay();
  }

  private updateDisplay() {
    if (this.isOn) {
      const text = `${this.temperature}ºC`;
      this.displayMat.emissiveMap = MaterialLibrary.getInstance().generateTextMap(text, 'StoveDisplay');
      this.displayMat.emissive.setRGB(1, 1, 1);
    } else {
      this.displayMat.emissive.setRGB(0, 0, 0);
    }

    this.displayMat.needsUpdate = true;
  }

  private animate() {
    // Calculate the offset of the rotation
    const period = 2; // In seconds
    const t = (Clock.elapsed * 2 * Math.PI) / period;
    const offset2d = polarVector(t, 0.04);
    const offset = new THREE.Vector3(offset2d.x, 0, offset2d.y);

    // Apply rotation to shelf
    this.shelf.position.copy(this.shelfInitPosition);
    this.shelf.position.add(offset);

    // Apply rotation to every object in the anchors
    this.anchors.forEach((anchor, idx) => {
      if (!anchor.occupied) return;
      if (anchor.labObject.grabbed) return;

      const initPosition = this.anchorsInitPositions[idx];
      const obj = anchor.labObject.object;
      const quat = obj.getWorldQuaternion(new THREE.Quaternion());
      obj.position.copy(initPosition);
      obj.position.add(offset.clone().applyQuaternion(quat));
    });
  }

  private populateHitSurfacesMats() {
    type SimpleMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

    const handle = this.getObjectByPrefix('handle');
    const handleMeshes = findObjectsBy(handle, (child: SimpleMesh) => child.isMesh) as SimpleMesh[];
    handleMeshes.forEach((mesh) => (mesh.material = mesh.material.clone()));
    const handleMats = handleMeshes.map((mesh) => mesh.material).flat();
    const handleHitSurf = this.hitSurfaces.find((hs) => hs.name.match(/^hitSurface[^a-zA-Z]/));

    const switchMeshes = findObjectsBy(this.switch, (child: SimpleMesh) => child.isMesh) as SimpleMesh[];
    switchMeshes.forEach((mesh) => (mesh.material = mesh.material.clone()));
    const switchMats = switchMeshes.map((mesh) => mesh.material).flat();
    const switchHitSurf = this.hitSurfaces.find((hs) => hs.name.startsWith('hitSurfaceSwitchButton'));

    // Save original emissive color
    [...handleMats, ...switchMats].forEach(
      (material) => (material.userData.originalEmissive = material.emissive.clone())
    );

    this.highlightMatsRefs = [
      { hitSurface: handleHitSurf, materials: handleMats },
      { hitSurface: switchHitSurf, materials: switchMats },
    ];
  }

  private checkAlarm() {
    if (this.doorState == 'opened' && !this.alarmController) {
      const secondsOpened = Clock.elapsed - this.lastTimeOpened;
      if (secondsOpened > StirringStove.ALARM_SECONDS) this.alarmController = intermitentBeep('B5', 500, 1000);
    }
  }

  private stopAlarm() {
    this.lastTimeOpened = undefined;

    if (this.alarmController) {
      this.alarmController.stop();
      this.alarmController = undefined;
    }
  }
}
