import { Object3D } from 'three';
import { LabObject } from './LabObject';
import * as THREE from 'three';

export class SimpleLabObject extends LabObject {
  constructor(obj: THREE.Object3D) {
    super(obj);

    this.holdingPoint = new Object3D();
    this.object.add(this.holdingPoint);

    let ax = new THREE.AxesHelper(0.01);
    //this.holdingPoint.add(ax)

    obj.traverse((child) => {
      if (child.name.startsWith('hitSurface')) {
        this.hitSurfaces.push(child);
        child.visible = false;
      } else if (child.name.startsWith('holdingPoint')) {
        this.holdingPoint.position.copy(child.position.clone());
        this.holdingPoint.rotation.copy(child.rotation.clone());
      } else if (child.name.startsWith('basePoint')) {
        this.baseChild = child;

        let ax = new THREE.AxesHelper(0.01);
        //this.baseChild.add(ax)
      }

      // Check if current child has materials to highlight
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (Array.isArray(mesh.material)) {
          const materials = mesh.material.map((mat) => mat.clone()) as THREE.MeshStandardMaterial[];
          materials.forEach((mat) => (mat.userData.originalEmissive = mat.emissive));
          this.highlightMats.push(...materials);
          mesh.material = materials;
        } else {
          const material = mesh.material.clone() as THREE.MeshStandardMaterial;
          material.userData.originalEmissive = material.emissive;
          this.highlightMats.push(material);
          mesh.material = material;
        }
      }
    });
  }
}
