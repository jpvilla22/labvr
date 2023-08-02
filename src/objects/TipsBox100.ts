import * as THREE from 'three';
import { SimpleLabObject } from './SimpleLabObject';

export class TipsBox100 extends SimpleLabObject {
  state: 'opened' | 'closed' = 'closed';

  private tipObject: THREE.Object3D;
  private lid: THREE.Object3D;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.addInteractionPointsFromObject('tipsPoint');

    this.tipObject = obj.getObjectByName('tip100');
    this.lid = this.getObjectByPrefix('lid');

    // Clone tips
    const { random } = Math;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i == 0 && j == 0) || random() > 0.8) continue;
        const tipClone = this.tipObject.clone();
        tipClone.position.x += i * 0.015;
        tipClone.position.z += j * 0.015;
        obj.add(tipClone);
      }
    }

    this.toggleOpen(false);
  }

  get tipsWorldPosition() {
    const result = new THREE.Vector3();
    return this.getInteractionPoint('tipsPoint').object.getWorldPosition(result);
  }

  onTriggerDown(): void {
    this.toggleOpen();
  }

  onGrabbed(): void {
    this.toggleOpen(true);
  }

  onDropped(): void {
    this.toggleOpen(false);
  }

  getNewTip() {
    const newTip = this.tipObject.clone();

    // Clone materials
    newTip.traverse((child: THREE.Mesh) => {
      if (child.isMesh && child.material) {
        const material = child.material as THREE.Material;
        child.material = material.clone();
      }
    });

    return newTip;
  }

  toggleOpen(open = this.state != 'opened') {
    const angle = open ? (-120 * Math.PI) / 180 : 0;
    this.lid.rotation.set(angle, 0, 0);
    this.state = open ? 'opened' : 'closed';
  }
}
