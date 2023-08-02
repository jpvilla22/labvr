import * as THREE from 'three';
import { error, htmlLog, warn } from '../utils/logger';
import { ContainerObject } from './ContainerObject';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { Solution } from '../Solution';
import { P100 } from './P100';
import { LabObjectsFactory } from './LabObjectsFactory';
import { any } from '../utils/any';

export class Erlenmeyer extends ContainerObject {
  static cultive: Solution;

  private cap: THREE.Object3D;
  private content: THREE.Object3D;
  private labelMat: THREE.MeshPhongMaterial;
  private matlib: MaterialLibrary;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.matlib = MaterialLibrary.getInstance();

    this.content = this.getObjectByPrefix('content');
    this.updateLiquid();

    this.cap = this.getObjectByRegex(/^cap$/);
    if (!this.cap) warn("No object 'cap' was found on Erlenmeyer");

    const capPoint = this.getObjectByPrefix('capPoint');
    const liquidPoint = this.getObjectByPrefix('liquidPoint');
    if (!capPoint || !liquidPoint) {
      error('No cap point or liquid point found for Erlenmeyer');
      return;
    }

    const res = this.getObjectsByPrefix('label');
    if (res && res.length > 0) {
      this.labelMat = (res[0] as THREE.Mesh).material as THREE.MeshPhongMaterial;
      this.labelMat.depthWrite = false;
    }

    this.interactionPoints.push({ object: capPoint, name: 'capPoint' });
    this.interactionPoints.push({ object: liquidPoint, name: 'liquidPoint' });
  }

  get capWorldPosition() {
    const result = new THREE.Vector3();
    return this.getInteractionPoint('capPoint').object.getWorldPosition(result);
  }

  distanceTo(dropper: P100): number {
    const tipPosition = dropper.tipWorldPosition;
    const capPoint = this.getInteractionPoint('capPoint').object;
    const capPosition = capPoint.getWorldPosition(new THREE.Vector3());
    const liquidPoint = this.getInteractionPoint('liquidPoint').object;
    const liquidPosition = liquidPoint.getWorldPosition(new THREE.Vector3());

    return Math.min(tipPosition.distanceTo(liquidPosition), tipPosition.distanceTo(capPosition));
  }

  setLabel(text: string) {
    let texture = this.matlib.generateTextMap(text, 'ErlenmeyerLabel');
    this.labelMat.alphaMap = texture;
  }

  extractSolution(ml: number): Solution {
    const result = super.extractSolution(ml);
    this.updateLiquid();
    return result;
  }

  dropSolution(newSolution: Solution): void {
    super.dropSolution(newSolution);
    this.updateLiquid();
  }

  setSolution(newSolution: Solution): void {
    super.setSolution(newSolution);
    this.updateLiquid();
  }

  empty(): void {
    super.empty();
    this.updateLiquid();
  }

  disable(): void {
    super.disable();
    this.toggleOpen(false);
  }

  onGrabbed(): void {
    const msg = this.solution ? `con ${this.solution.type}` : `vacío`;
    htmlLog(`Erlenmeyer ${msg}`);
  }

  update() {
    const droppers = [...LabObjectsFactory.objects.p1000, ...LabObjectsFactory.objects.p100] as P100[];
    const anyDropperIsClose = any(
      droppers,
      (dropper) => dropper.hasTip && dropper.tipWorldPosition.distanceTo(this.capWorldPosition) < 0.1
    );

    if (anyDropperIsClose) this.toggleOpen(true);
    else this.toggleOpen(false);
  }

  private toggleOpen(value = !this.isOpened) {
    this.isOpened = value;

    if (this.cap) this.cap.rotation.x = this.isOpened ? (-100 * Math.PI) / 180 : 0;
  }

  private updateLiquid() {
    this.content.visible = !!this.solution;
  }
}
