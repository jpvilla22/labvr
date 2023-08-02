import * as THREE from 'three';
import { htmlLog } from '../utils/logger';
import { SimpleLabObject } from './SimpleLabObject';
import { LabObjectsFactory } from './LabObjectsFactory';
import { PetriDish } from './PetriDish';

export class Spatula extends SimpleLabObject {
  whileGrabbed() {
    const spatulaPosition = this.object.getWorldPosition(new THREE.Vector3());

    let petris = LabObjectsFactory.objects.petriDish as PetriDish[];
    petris = petris.filter((petri) => petri.isOpened && !petri.isSpread);
    const closest = petris.sort((a, b) => {
      const aDist = a.contentWorldPosition.distanceToSquared(spatulaPosition);
      const bDist = b.contentWorldPosition.distanceToSquared(spatulaPosition);
      return aDist - bDist;
    })[0];

    if (!closest) return;

    const minDistance = 0.05;
    if (closest.contentWorldPosition.distanceTo(spatulaPosition) < minDistance) {
      // Spread petri
      closest.spread();
      this.controller.pulse(0.5, 200);
      htmlLog('Placa de petri esparcida');
    }
  }
}
