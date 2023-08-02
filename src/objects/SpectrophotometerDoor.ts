import * as THREE from 'three';
import { SimpleLabObject } from './SimpleLabObject';

export class SpectrophotometerDoor extends SimpleLabObject {
  readonly grabbable: boolean = false;

  private doorState: 'closed' | 'opened' = 'closed';

  constructor(obj: THREE.Object3D) {
    super(obj);
    this.type = 'sphDoor';
  }

  onTriggerDown() {
    this.toggleDoor();
  }

  onGripDown() {
    this.toggleDoor();
  }

  close() {
    this.object.rotation.x = 0;
    this.doorState = 'closed';
  }

  toggleDoor() {
    const openedAngle = 60;

    if (this.doorState == 'opened') {
      this.close();
    } else {
      this.object.rotation.x = (-openedAngle * Math.PI) / 180;
      this.doorState = 'opened';
    }
  }
}
