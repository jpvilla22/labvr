import * as THREE from 'three';
import { Solution } from '../Solution';
import { ContainerObject } from './ContainerObject';

export class Cuvette extends ContainerObject {
  isOpened: boolean = true;

  private liquid: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.liquid = this.getObjectByPrefix('liquid') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    this.updateLiquid();

    this.addInteractionPointsFromObject('capPoint');
  }

  get capWorldPosition() {
    const result = new THREE.Vector3();
    return this.getInteractionPoint('capPoint').object.getWorldPosition(result);
  }

  extractSolution(ml: number): Solution {
    const result = super.extractSolution(ml);
    this.updateLiquid();
    return result;
  }

  dropSolution(newSolution: Solution) {
    super.dropSolution(newSolution);
    this.updateLiquid();
  }

  setSolution(newSolution: Solution) {
    super.setSolution(newSolution);
    this.updateLiquid();
  }

  empty(): void {
    super.empty();
    this.updateLiquid();
  }

  private updateLiquid() {
    if (this.solution) {
      var yScale = Math.min(this.solution.millilitres, 1.25);
      if (this.solution.color) this.liquid.material.color.copy(this.solution.color);
    } else {
      yScale = 0;
    }

    this.liquid.scale.setY(yScale);
  }
}
