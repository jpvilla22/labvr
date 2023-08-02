import { beep } from '../utils/audio';
import { htmlLog } from '../utils/logger';
import { CompoundLabObject } from './CompoundLabObject';
import { SpectrophotometerDoor } from './SpectrophotometerDoor';
import { SpectrophotometerKnob } from './SpectrophotometerKnob';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { ExperimentData } from '../ExperimentData';
import { RecordingSheet } from '../RecordingSheet';

export class Spectrophotometer extends CompoundLabObject {
  readonly grabbable: boolean = false;

  door: SpectrophotometerDoor;
  knob: SpectrophotometerKnob;

  private matlib: MaterialLibrary;
  private displayMat: THREE.MeshPhongMaterial;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.matlib = MaterialLibrary.getInstance();

    const doorObj = this.getObjectByPrefix('door');
    this.door = new SpectrophotometerDoor(doorObj);

    const knobObj = this.getObjectByPrefix('knob');
    this.knob = new SpectrophotometerKnob(knobObj);

    this.children.push(this.door, this.knob);

    this.buildAnchors();

    this.populateHitSurfaces(false);

    const display = this.getObjectByPrefix('display') as THREE.Mesh;
    this.displayMat = display.material as THREE.MeshPhongMaterial;

    this.setDisplayValue('0.000');
  }

  enable(): void {
    super.enable();
    this.door.close();
  }

  setDisplayValue(text: string) {
    this.displayMat.map = this.matlib.generateTextMap(text, 'SPMDisplay');
    this.displayMat.color.setRGB(0.5, 0.5, 0.5);
  }

  onTriggerDown(hitSurface: THREE.Object3D): void {
    if (hitSurface.name.startsWith('hitSurfacePrintButton')) {
      beep('E5', 200);
      const density = ExperimentData.getOpticDensity(RecordingSheet.temperature, RecordingSheet.currentHour);
      RecordingSheet.setCurrentSampleDO(density);
      this.setDisplayValue(density.toString().slice(0, 5));
    } else if (hitSurface.name.startsWith('hitSurface0TButton')) {
      beep('E5', 200);
      this.setDisplayValue('0.000');
    }
  }

  toggleOpen() {
    this.door.toggleDoor();
  }
}
