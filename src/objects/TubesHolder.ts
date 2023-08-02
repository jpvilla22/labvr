import { AnchorPoint } from '../anchor/AnchorPoint';
import { Solution } from '../Solution';
import { LabObject } from './LabObject';
import { LabObjectsFactory } from './LabObjectsFactory';
import { TestTube } from './TestTube';

export class TubesHolder extends LabObject {
  grabbable = false;
  interactionEnabled = false;

  private anchors: AnchorPoint[] = [];

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.anchors = this.buildAnchors();
  }

  populateTubes() {
    const anchorsCount = this.anchors.length;

    // Create new tubes
    const tube = LabObjectsFactory.models.tube as TestTube;
    const clonedTubes = new Array(anchorsCount).fill(0).map(() => tube.clone()) as TestTube[];

    // Sort anchors from left to right
    this.anchors.sort((a, b) => {
      return a.position.x - b.position.x;
    });

    clonedTubes.forEach((tube, idx) => {
      const anchor = this.anchors[idx];
      tube.placeOnAnchor(anchor);
      tube.setSolution(new Solution('dilución', 1, 9));
      tube.setLabel(`-${idx + 1}`);
    });

    return clonedTubes;
  }
}
