import * as THREE from 'three';
import { InteractionPoint } from './LabObject';
import { SimpleLabObject } from './SimpleLabObject';

export class WasteBin extends SimpleLabObject {
  state: 'opened' | 'closed' = 'closed';

  private dropPoint: InteractionPoint;
  private lid: THREE.Object3D;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.dropPoint = this.addInteractionPointsFromObject('dropPoint')[0];
    this.lid = this.getObjectByPrefix('lid');

    this.toggleOpen(true);
  }

  get dropPointWorldPosition() {
    const result = new THREE.Vector3();
    return this.dropPoint.object.getWorldPosition(result);
  }

  onTriggerDown(): void {
    this.toggleOpen();
  }

  toggleOpen(open = this.state != 'opened') {
    if (open) {
      const angle = (70 * Math.PI) / 180;
      this.lid.rotation.x = angle;
      this.state = 'opened';
    } else {
      this.lid.rotation.x = Math.PI;
      this.state = 'closed';
    }
  }
}
