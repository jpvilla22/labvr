import * as THREE from 'three';
import { LabObject } from './LabObject';

export class Vortex extends LabObject {
  constructor(obj: THREE.Object3D) {
    super(obj);

    this.addInteractionPointsFromObject('hatPoint');
  }

  get hatWorldPosition() {
    return this.getInteractionPoint('hatPoint').object.getWorldPosition(new THREE.Vector3());
  }
}
