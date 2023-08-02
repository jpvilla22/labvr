import { LabObject } from './LabObject';

export type HighlighMaterialRef = {
  hitSurface: THREE.Object3D;
  materials: THREE.MeshStandardMaterial[];
};

export class CompoundLabObject extends LabObject {
  children: LabObject[] = [];

  protected highlightMatsRefs: HighlighMaterialRef[] = [];

  constructor(obj: THREE.Object3D) {
    super(obj);
  }

  get descendants(): LabObject[] {
    const result: LabObject[] = [];

    this.children.forEach((child) => {
      result.push(child);
      if (child instanceof CompoundLabObject) result.push(...child.descendants);
    });

    return result;
  }

  highlight(value: boolean = true, hitSurface?: THREE.Object3D) {
    if (!value) {
      const allMats = this.highlightMatsRefs.map((ref) => ref.materials).flat();
      allMats.forEach((mat) => mat.emissive.copy(mat.userData.originalEmissive));
    } else if (hitSurface) {
      const materials = this.highlightMatsRefs.find((ref) => ref.hitSurface == hitSurface)?.materials;
      if (materials) materials.forEach((mat) => mat.emissive.copy(LabObject.HIGHLIGHT_COLOR));
    }
  }
}
