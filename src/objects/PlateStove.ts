import { RecordingSheet } from '../RecordingSheet';
import { AnchorPoint } from '../anchor/AnchorPoint';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { Clock } from '../utils/Clock';
import { OscillatorController, beep, intermitentBeep } from '../utils/audio';
import { findObjectsBy } from '../utils/findObjectBy';
import { htmlLog } from '../utils/logger';
import { CompoundLabObject } from './CompoundLabObject';

export class PlateStove extends CompoundLabObject {
  readonly grabbable: boolean = false;

  anchors: AnchorPoint[] = [];

  private isOn: boolean = false;
  private switch: THREE.Object3D;
  private door: THREE.Object3D;
  private doorState: 'opened' | 'closed' = 'closed';
  private displayMat: THREE.MeshPhongMaterial;
  private matlib: MaterialLibrary;
  private temperature: number;
  private lastTimeOpened: number;
  private alarmController: OscillatorController;

  private static ALARM_SECONDS = 10;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.matlib = MaterialLibrary.getInstance();
    this.switch = this.object.getObjectByName('switch');
    this.door = this.getObjectByPrefix('door');
    this.temperature = RecordingSheet.temperature;

    this.anchors = this.buildAnchors();

    const res = this.getObjectsByPrefix('display');
    if (res && res.length > 0) {
      this.displayMat = (res[0] as THREE.Mesh).material as THREE.MeshPhongMaterial;
    }

    this.populateHitSurfaces();
    this.populateHitSurfacesMats();

    this.updateDisplay();
    this.togglePower(false);
  }

  enable(): void {
    super.enable();
    this.anchors.forEach((anchor) => anchor.enable());
    this.close();
  }

  onTriggerDown(hitSurface: THREE.Object3D): void {
    if (hitSurface.name.startsWith('hitSurfaceSwitch')) {
      this.togglePower();
    } else if (hitSurface.name.startsWith('hitSurfaceUp') && this.isOn) {
      beep('G5', 200);
      if (RecordingSheet.currentHour == 0) this.incrementTemperature();
    } else if (hitSurface.name.startsWith('hitSurfaceDown') && this.isOn) {
      beep('F5', 200);
      if (RecordingSheet.currentHour == 0) this.decrementTemperature();
    } else if (hitSurface.name.startsWith('hitSurfaceHandle')) {
      this.toggleDoor();
    }
  }

  open() {
    if (this.doorState == 'opened') return;

    this.door.rotateY(Math.PI / 2);
    this.doorState = 'opened';
    this.updateAlarmCountdown();
  }

  close() {
    if (this.doorState == 'closed') return;

    this.door.rotateY(-Math.PI / 2);
    this.doorState = 'closed';
    this.stopAlarm();
  }

  update() {
    super.update();
    this.checkAlarm();
  }

  private togglePower(value = !this.isOn) {
    this.isOn = value;
    this.switch.rotation.x = ((this.isOn ? -1 : 1) * 30 * Math.PI) / 180;

    if (this.isOn) this.updateAlarmCountdown();
    else this.stopAlarm();

    this.updateDisplay();
  }

  private toggleDoor(open = this.doorState != 'opened') {
    if (open) this.open();
    else this.close();
  }

  private incrementTemperature() {
    if (this.temperature == 18) {
      this.temperature = 37;
      this.updateDisplay();
    }
  }

  private decrementTemperature() {
    if (this.temperature == 37) {
      this.temperature = 18;
      this.updateDisplay();
    }
  }

  private updateDisplay() {
    if (this.isOn) {
      const text = `${this.temperature}ºC`;
      this.displayMat.emissiveMap = this.matlib.generateTextMap(text, 'StoveDisplay');
      this.displayMat.emissive.setRGB(1, 1, 1);
    } else {
      this.displayMat.emissive.setRGB(0, 0, 0);
    }

    this.displayMat.needsUpdate = true;
  }

  private populateHitSurfacesMats() {
    type SimpleMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

    const handle = this.getObjectByPrefix('handle');
    const handleMeshes = findObjectsBy(handle, (child: SimpleMesh) => child.isMesh) as SimpleMesh[];
    handleMeshes.forEach((mesh) => (mesh.material = mesh.material.clone()));
    const handleMats = handleMeshes.map((mesh) => mesh.material).flat();
    const handleHitSurf = this.hitSurfaces.find((hs) => hs.name.startsWith('hitSurfaceHandle'));

    const switchMeshes = findObjectsBy(this.switch, (child: SimpleMesh) => child.isMesh) as SimpleMesh[];
    switchMeshes.forEach((mesh) => (mesh.material = mesh.material.clone()));
    const switchMats = switchMeshes.map((mesh) => mesh.material).flat();
    const switchHitSurf = this.hitSurfaces.find((hs) => hs.name.startsWith('hitSurfaceSwitch'));

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
    if (this.doorState == 'opened' && this.isOn && !this.alarmController) {
      const secondsOpened = Clock.elapsed - this.lastTimeOpened;
      if (secondsOpened > PlateStove.ALARM_SECONDS) this.alarmController = intermitentBeep('A5', 500, 1000);
    }
  }

  private updateAlarmCountdown() {
    if (!this.isOn || this.doorState == 'closed') this.lastTimeOpened = undefined;
    else if (!this.lastTimeOpened) this.lastTimeOpened = Clock.elapsed;
  }

  private stopAlarm() {
    this.lastTimeOpened = undefined;

    if (this.alarmController) {
      this.alarmController.stop();
      this.alarmController = undefined;
    }
  }
}
