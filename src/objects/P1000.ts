import * as THREE from 'three';
import { P100 } from './P100';
import { TipsBox1000 } from './TipsBox1000';

export class P1000 extends P100 {
  readonly capacity = 1;

  protected getNearTip() {
    const minDistance = 0.1;
    const others = this.getOtherObjects();
    const tipPoint = this.getInteractionPoint('tipPoint');
    const tipPosition = tipPoint.object.getWorldPosition(new THREE.Vector3());
    const tipsBox = others.find((obj) => obj.type == 'tipsbox1000') as TipsBox1000;

    if (tipsBox?.tipsWorldPosition.distanceTo(tipPosition) < minDistance) {
      return tipsBox.getNewTip();
    } else {
      return undefined;
    }
  }
}
