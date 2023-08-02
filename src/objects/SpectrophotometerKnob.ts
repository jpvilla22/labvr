import { beep } from '../utils/audio';
import { SimpleLabObject } from './SimpleLabObject';

export class SpectrophotometerKnob extends SimpleLabObject {
  readonly grabbable: boolean = false;

  constructor(obj: THREE.Object3D) {
    super(obj);
    this.type = 'sphKnob';
  }

  onTriggerDown() {
    beep('C#4', 200);
  }
}
