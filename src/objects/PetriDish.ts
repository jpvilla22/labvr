import { MaterialLibrary } from '../materials/MaterialLibrary';
import * as THREE from 'three';
import { Solution } from '../Solution';
import { ContainerObject } from './ContainerObject';
import { htmlLog, warn } from '../utils/logger';
import { PetriState } from '../RecordingSheet';

export class PetriDish extends ContainerObject {
  private static readonly TEXT_COLOR = new THREE.Color(0x990000);

  public isSpread = true;
  public content: THREE.Mesh;

  private status: 'opened' | 'closed' = 'closed';
  private lid: THREE.Object3D;
  private lidTag: THREE.Mesh;
  private sideTag: THREE.Mesh;
  private liquid: THREE.Mesh;
  private matlib: MaterialLibrary;
  private labelText: string;
  private coloniesCount?: number;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.matlib = MaterialLibrary.getInstance();
    this.lid = this.getObjectByPrefix('lid');

    this.content = obj.getObjectByName('content') as THREE.Mesh;
    if (!this.content.isMesh) warn(`Child 'content' in PetriDish should be a mesh`);

    this.lidTag = this.getObjectByPrefix('lidTag') as THREE.Mesh;
    if (!this.lidTag.isMesh) warn(`Child 'lidTag' in PetriDish should be a mesh`);

    this.sideTag = this.getObjectByPrefix('bottomTag') as THREE.Mesh;
    if (!this.sideTag.isMesh) warn(`Child 'bottomTag' in PetriDish should be a mesh`);

    this.liquid = this.getObjectByPrefix('liquid') as THREE.Mesh;
    this.updateLiquid();

    this.addInteractionPointsFromObject('contentPoint');

    const lidMaterial = this.lidTagMaterial;
    lidMaterial.color.copy(PetriDish.TEXT_COLOR);
    lidMaterial.transparent = true;

    const sideMaterial = this.sideTagMaterial;
    sideMaterial.color.copy(PetriDish.TEXT_COLOR);
    sideMaterial.transparent = true;

    this.setLabel('');
  }

  get contentWorldPosition() {
    const result = new THREE.Vector3();
    return this.getInteractionPoint('contentPoint').object.getWorldPosition(result);
  }

  get isPolluted() {
    return this.solution && this.solution.type != 'cultivo';
  }

  get label() {
    return this.labelText;
  }

  get colonies(): number {
    return this.coloniesCount;
  }

  get cultureConcentration(): number {
    return this.solution?.type == 'cultivo' ? this.solution.concentration : undefined;
  }

  onTriggerDown() {
    this.toggleOpen();
  }

  open() {
    if (this.status == 'closed') this.toggleOpen();
  }

  close() {
    if (this.status == 'opened') this.toggleOpen();
  }

  spread() {
    this.isSpread = true;
    this.updateLiquid();
  }

  extractSolution(ml: number): Solution {
    // Cannot extract solution from petri dish
    return undefined;
  }

  dropSolution(solution: Solution) {
    super.dropSolution(solution);
    this.isSpread = false;
    this.updateLiquid();
  }

  setLabel(text: string) {
    this.labelText = text;

    const lidTexture = this.matlib.generateTextMap(text, 'PetriCapLabel');
    this.lidTagMaterial.alphaMap = lidTexture;
    this.lidTagMaterial.side = THREE.DoubleSide;
    this.lidTagMaterial.depthWrite = false;

    const sideTexture = this.matlib.generateTextMap(text, 'PetriSideLabel');
    this.sideTagMaterial.alphaMap = sideTexture;
    this.sideTagMaterial.side = THREE.DoubleSide;
    this.sideTagMaterial.depthWrite = false;
  }

  hydrate(state: PetriState) {
    this.solution = state.solution?.clone();
    this.setLabel(state.label);
    this.isSpread = state.spread;
    this.coloniesCount = state.coloniesCount;

    if (this.coloniesCount) {
      const mat = MaterialLibrary.getInstance().createColonyMaterial(this.coloniesCount, this.isSpread);
      this.content.material = mat;
    }
  }

  private get lidTagMaterial(): THREE.MeshStandardMaterial {
    return this.lidTag?.material as THREE.MeshStandardMaterial;
  }

  private get sideTagMaterial(): THREE.MeshStandardMaterial {
    return this.sideTag?.material as THREE.MeshStandardMaterial;
  }

  private toggleOpen() {
    const offset = new THREE.Vector3(0, 0.05, -0.05);

    if (this.status == 'closed') {
      this.lid.rotateX(-Math.PI / 2);
      this.lid.position.add(offset);
      this.status = 'opened';
      this.isOpened = true;
    } else {
      this.lid.rotateX(Math.PI / 2);
      this.lid.position.sub(offset);
      this.status = 'closed';
      this.isOpened = false;
    }
  }

  private updateLiquid() {
    this.liquid.visible = !!this.solution;

    this.liquid.scale.setX(this.isSpread ? 1 : 0.3);
    this.liquid.scale.setZ(this.isSpread ? 1 : 0.3);
  }
}
