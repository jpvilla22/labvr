import { RecordingSheet } from '../RecordingSheet';
import { AnchorPoint } from '../anchor/AnchorPoint';
import { htmlLog, warn } from '../utils/logger';
import { LabObject } from './LabObject';
import { LabObjectsFactory } from './LabObjectsFactory';
import { PetriDish } from './PetriDish';
import { TVScreen } from './TVScreen';

export class PetriTray extends LabObject {
  grabbable: boolean = false;
  interactionEnabled: boolean = false;

  trayNumber: number;

  private anchors: AnchorPoint[];

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.anchors = this.buildAnchors();
    if (this.anchors.length < 2) warn('LabObject PetriTray is supposed to have two anchor points');

    this.anchors.map((anchor, idx) => anchor.onOccupupied(this.onPetriPlaced.bind(this, idx)));
    this.anchors.map((anchor, idx) => anchor.onFreed(this.onPetriRemoved.bind(this, idx)));
  }

  clone(): PetriTray {
    const cloned = super.clone() as PetriTray;
    return cloned;
  }

  private onPetriPlaced(slot: number) {
    const petri = this.anchors[slot].labObject as PetriDish;
    RecordingSheet.setChosen(this.trayNumber, petri, slot);

    htmlLog(`Petri ${petri.colonies != undefined ? `con ${petri.colonies}` : 'sin'} colonias`);
    const tv = LabObjectsFactory.objects.tv[0] as TVScreen;
    tv.updateChart();
  }

  private onPetriRemoved(slot: number) {
    RecordingSheet.clearChosen(this.trayNumber, slot);
    const tv = LabObjectsFactory.objects.tv[0] as TVScreen;
    tv.updateChart();
  }
}
