import * as THREE from 'three';
import { Solution } from '../Solution';
import { ContainerObject } from './ContainerObject';
import { LabObjectsFactory } from './LabObjectsFactory';
import { Vortex } from './Vortex';
import { htmlLog, warn } from '../utils/logger';
import { findObjectByPrefix } from '../utils/findObjectBy';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { P100 } from './P100';
import { any } from '../utils/any';
import { WasteBin } from './WasteBin';

export class TestTube extends ContainerObject {
  contentMixed: boolean = true;

  private cap: THREE.Object3D;
  private liquidColumn: THREE.Object3D;
  private liquidBase: THREE.Object3D;
  private tagMaterial: THREE.MeshStandardMaterial;
  private labelText: string;
  private state: 'opened' | 'closed' = 'closed';

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.addInteractionPointsFromObject('capPoint');

    this.cap = this.object.getObjectByName('cap');
    if (!this.cap) warn("Object 'cap' not found");

    const tag = this.object.getObjectByName('tag') as THREE.Mesh;
    this.tagMaterial = tag.material as THREE.MeshStandardMaterial;
    this.tagMaterial.transparent = true;
    this.tagMaterial.color.set(0x880022);

    const liquid = findObjectByPrefix(this.object, 'liquid');
    this.liquidColumn = findObjectByPrefix(liquid, 'column');
    this.liquidBase = findObjectByPrefix(liquid, 'base');
    this.updateLiquid();

    this.setLabel('-6');
  }

  get capWorldPosition() {
    const result = new THREE.Vector3();
    return this.getInteractionPoint('capPoint').object.getWorldPosition(result);
  }

  setLabel(text: string) {
    this.labelText = text;
    this.tagMaterial.alphaMap = MaterialLibrary.getInstance().generateTextMap(this.labelText, 'TubeLabel');
  }

  whileGrabbed() {
    const vortex = LabObjectsFactory.objects.vortex[0] as Vortex;
    const hatPosition = vortex.hatWorldPosition;
    const basePosition = this.baseWorldPosition;
    const minDistance = 0.03;

    if (basePosition.distanceTo(hatPosition) < minDistance) this.shake();
  }

  onThumbButtonDown() {
    super.onThumbButtonDown();

    const capPoint = this.capWorldPosition;

    const wasteBin = LabObjectsFactory.objects.bin?.[0] as WasteBin;
    if (wasteBin && wasteBin.dropPointWorldPosition.distanceTo(capPoint) < 0.1) {
      this.setSolution(new Solution('medio', 1, 9));
      htmlLog(`Contenido del tubo reseteado:`);
      htmlLog(`  ${this.solution.toString()}`);
    }
  }

  dropSolution(newSolution: Solution) {
    if (this.solution && !this.solution.equals(newSolution)) this.contentMixed = false;

    super.dropSolution(newSolution);
    this.updateLiquid();
  }

  setSolution(newSolution: Solution): void {
    super.setSolution(newSolution);
    this.updateLiquid();
  }

  extractSolution(ml: number): Solution {
    const result = super.extractSolution(ml);
    this.updateLiquid();
    return result;
  }

  shake() {
    this.contentMixed = true;
    this.controller?.pulse(0.7, 200);
  }

  empty() {
    super.empty();
    this.updateLiquid();
  }

  update() {
    const droppers = [...LabObjectsFactory.objects.p1000, ...LabObjectsFactory.objects.p100] as P100[];
    const anyDropperIsClose = any(
      droppers,
      (dropper) => dropper.hasTip && dropper.tipWorldPosition.distanceTo(this.capWorldPosition) < 0.1
    );

    if (anyDropperIsClose) this.open();
    else this.close();
  }

  private updateLiquid() {
    if (!this.solution) {
      this.liquidBase.visible = this.liquidColumn.visible = false;
    } else {
      this.liquidBase.visible = this.liquidColumn.visible = true;
      const yScale = Math.min(1, this.solution.millilitres / 10);
      this.liquidColumn.scale.setY(yScale);
    }
  }

  private open() {
    if (this.state == 'closed') {
      this.cap.rotation.x = -(100 * Math.PI) / 180;
      this.state = 'opened';
      this.isOpened = true;
    }
  }

  private close() {
    if (this.state == 'opened') {
      this.cap.rotation.x = 0;
      this.state = 'closed';
      this.isOpened = false;
    }
  }
}
