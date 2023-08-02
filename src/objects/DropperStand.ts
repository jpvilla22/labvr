import { SimpleLabObject } from './SimpleLabObject';

export class DropperStand extends SimpleLabObject {
  constructor(obj: THREE.Object3D) {
    super(obj);

    this.buildAnchors();
  }
}
