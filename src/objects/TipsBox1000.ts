import * as THREE from 'three';
import { SimpleLabObject } from './SimpleLabObject';

export class TipsBox1000 extends SimpleLabObject {
  state: 'opened' | 'closed' = 'closed';

  private tipObject: THREE.Object3D;
  private lid: THREE.Object3D;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.addInteractionPointsFromObject('tipsPoint');

    this.tipObject = this.getObjectByPrefix('tip1000');
    this.lid = this.getObjectByPrefix('lid');

    // Clone tips
    const { random } = Math;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4 - i; j++) {
        if ((i == 0 && j == 0) || random() > 0.8) continue;
        const tipClone = this.tipObject.clone();
        tipClone.position.x -= i * 0.016;
        tipClone.position.z -= j * 0.016;
        obj.add(tipClone);
      }
    }

    this.toggleOpen(false);
  }

  get tipsWorldPosition() {
    const result = new THREE.Vector3();
    return this.getInteractionPoint('tipsPoint').object.getWorldPosition(result);
  }

  getNewTip() {
    return this.tipObject.clone();
  }

  onTriggerDown() {
    this.toggleOpen();
  }

  onGrabbed(): void {
    this.toggleOpen(true);
  }

  onDropped(): void {
    this.toggleOpen(false);
  }

  toggleOpen(open = this.state != 'opened') {
    if (open) {
      const angle = (45 * Math.PI) / 180;
      this.lid.rotation.set(0, angle, 0);
      this.lid.position.set(-0.028, 0.005, 0);
      this.state = 'opened';
    } else {
      this.lid.rotation.set(0, 0, 0);
      this.lid.position.set(0, 0, 0);
      this.state = 'closed';
    }
  }
}
