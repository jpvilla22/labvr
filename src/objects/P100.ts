import * as THREE from 'three';
import { Solution } from '../Solution';
import { htmlLog } from '../utils/logger';
import { ContainerObject } from './ContainerObject';
import { Erlenmeyer } from './Erlenmeyer';
import { SimpleLabObject } from './SimpleLabObject';
import { PetriDish } from './PetriDish';
import { TestTube } from './TestTube';
import { TipsBox100 } from './TipsBox100';
import { WasteBin } from './WasteBin';
import { findObjectByPrefix } from '../utils/findObjectBy';
import { Cuvette } from './Cuvette';

export class P100 extends SimpleLabObject {
  content?: Solution;
  tip?: THREE.Object3D;
  readonly capacity: number = 0.1; // Millilitres

  private mainButton: THREE.Object3D;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.mainButton = this.getObjectByPrefix('mainButton');
    this.mainButton.translateY(-0.019);

    this.addInteractionPointsFromObject('tipPoint');
  }

  get tipWorldPosition(): THREE.Vector3 {
    const tipPosition = new THREE.Vector3();
    const tipPoint = this.getInteractionPoint('tipPoint');
    return tipPoint.object.getWorldPosition(tipPosition);
  }

  get hasTip(): boolean {
    return !!this.tip;
  }

  enable() {
    super.enable();
    this.updateLiquidButton();
  }

  disable(): void {
    super.disable();
    this.discardTip();
  }

  onJoystickDown() {
    this.testLiquidInteraction();
  }

  onThumbButtonDown() {
    const minDistance = 0.1;
    const others = this.getOtherObjects();
    const tipPosition = new THREE.Vector3();
    const tipPoint = this.getInteractionPoint('tipPoint');
    tipPoint.object.getWorldPosition(tipPosition);

    // Test against tip box
    if (!this.tip) {
      const newTip = this.getNearTip();
      if (newTip) {
        this.placeTip(newTip);
        this.controller.pulse(0.5, 200);
        return;
      }
    }

    // Test against waste bin
    const bin = others.find((obj) => obj.type == 'bin') as WasteBin;
    if (bin?.dropPointWorldPosition.distanceTo(tipPosition) < minDistance) {
      this.discardTip();
      this.empty();
      return;
    }

    this.testLiquidInteraction();
  }

  protected getNearTip() {
    const minDistance = 0.1;
    const others = this.getOtherObjects();
    const tipPoint = this.getInteractionPoint('tipPoint');
    const tipPosition = tipPoint.object.getWorldPosition(new THREE.Vector3());
    const tipsBox = others.find((obj) => obj.type == 'tipsbox100') as TipsBox100;

    if (tipsBox?.tipsWorldPosition.distanceTo(tipPosition) < minDistance) {
      return tipsBox.getNewTip();
    } else {
      return undefined;
    }
  }

  private testLiquidInteraction() {
    // Extract or drop content
    if (!this.tip) return;

    const minDistance = 0.1;
    const tipPosition = new THREE.Vector3();
    const others = this.getOtherObjects();
    const tipPoint = this.getInteractionPoint('tipPoint');
    tipPoint.object.getWorldPosition(tipPosition);

    // Test against erlenmeyer
    const erlenmeyers = others.filter((obj) => obj.type == 'erlenmeyer') as Erlenmeyer[];
    const closestErlen = erlenmeyers
      .map((erlenmeyer) => ({ erlenmeyer, dist: erlenmeyer.distanceTo(this) }))
      .sort((a, b) => a.dist - b.dist)[0]?.erlenmeyer;

    if (closestErlen?.distanceTo(this) < minDistance) {
      if (this.content) this.dropSolutionIn(closestErlen);
      else this.extractFrom(closestErlen);
      this.controller.pulse(0.5, 200);
      return;
    }

    // Test again tubes
    const tubes = others.filter((obj) => obj.type == 'tube') as TestTube[];
    const closestTube = tubes.sort((a, b) => {
      const aDist = a.capWorldPosition.distanceToSquared(tipPosition);
      const bDist = b.capWorldPosition.distanceToSquared(tipPosition);
      return aDist - bDist;
    })[0];

    if (closestTube?.capWorldPosition.distanceTo(tipPosition) < minDistance) {
      if (this.content) this.dropSolutionIn(closestTube);
      else this.extractFrom(closestTube);
      this.controller.pulse(0.5, 200);
      return;
    }

    // Test against cuvettes
    const cuvettes = others.filter((obj) => obj.type == 'cuvette') as Cuvette[];
    const closestCuvette = cuvettes.sort((a, b) => {
      const aDist = a.capWorldPosition.distanceToSquared(tipPosition);
      const bDist = b.capWorldPosition.distanceToSquared(tipPosition);
      return aDist - bDist;
    })[0];

    if (closestCuvette?.capWorldPosition.distanceTo(tipPosition) < minDistance) {
      if (this.content) this.dropSolutionIn(closestCuvette);
      else this.extractFrom(closestCuvette);
      this.controller.pulse(0.5, 200);
      return;
    }

    // Test against petris
    if (!this.content) return;

    const petris = others.filter((obj) => obj.type == 'petriDish') as PetriDish[];
    const opened = petris.filter((petri) => petri.isOpened);
    const closestPetri = opened.sort((a, b) => {
      const aDist = a.contentWorldPosition.distanceToSquared(tipPosition);
      const bDist = b.contentWorldPosition.distanceToSquared(tipPosition);
      return aDist - bDist;
    })[0];

    if (closestPetri?.contentWorldPosition.distanceTo(tipPosition) < minDistance) {
      this.dropSolutionIn(closestPetri);
      this.controller.pulse(0.5, 200);
    }
  }

  private placeTip(newTip: THREE.Object3D) {
    const tipPoint = this.getInteractionPoint('tipPoint');

    newTip.position.copy(tipPoint.object.position);
    this.tip = newTip;
    this.object.add(newTip);
  }

  private discardTip() {
    this.object.remove(this.tip);
    this.tip = undefined;
    this.controller?.pulse(0.5, 200);
  }

  private empty() {
    this.content = undefined;
    this.updateLiquidButton();
  }

  private dropSolutionIn(container: ContainerObject) {
    if (this.content) htmlLog(`Solución "${this.content.type}" vertida en ${container.type}`);

    container.dropSolution(this.content);
    this.empty();

    this.controller.pulse(0.4, 100);
  }

  private extractFrom(container: ContainerObject) {
    this.content = container.extractSolution(this.capacity);

    this.updateLiquidButton();
    this.controller.pulse(0.4, 100);

    if (this.content) htmlLog(`Solución "${this.content.type}" extraída de ${container.type}`);
    else htmlLog(`El contenedor ${container.type} está vacío`);
  }

  private showTipLiquid(show: boolean) {
    if (!this.tip) return;

    const liquid = findObjectByPrefix(this.tip, 'liquid');
    liquid.scale.setScalar(show ? 0.5 : 0);
  }

  private updateLiquidButton() {
    if (!this.content) {
      this.mainButton.position.setY(0.089 - 0.019);
      this.showTipLiquid(false);
    } else {
      this.mainButton.position.setY(0.089);
      this.showTipLiquid(true);
    }
  }
}
