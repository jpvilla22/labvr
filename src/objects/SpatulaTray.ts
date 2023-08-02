import { AnchorPoint } from '../anchor/AnchorPoint';
import { LabObject } from './LabObject';

export class SpatulaTray extends LabObject {
  anchor: AnchorPoint;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.anchor = this.buildAnchors()[0];
  }

  enable() {
    super.enable();
    this.anchor.enable();
  }

  disable() {
    super.disable();
    this.anchor.disable();
  }
}
