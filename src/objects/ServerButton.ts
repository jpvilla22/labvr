import * as THREE from 'three';
import { LabObject } from './LabObject';
import { LabObjectType } from './LabObjectsFactory';
import { htmlLog } from '../utils/logger';
import { ActivityLog } from '../ActivityLog';

export class ServerButton extends LabObject {
  private material: THREE.MeshStandardMaterial;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.populateHitSurfaces();

    this.material = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
    this.material.userData.originalEmissive = this.material.emissive.clone();
    this.highlightMats.push(this.material);
  }

  static buildMesh(): THREE.Mesh {
    const width = 0.32;
    const height = 0.06;
    const name: LabObjectType = 'serverButton';

    const geometry = new THREE.BoxGeometry(width, height, 0.01);
    const material = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.4,
      visible: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;

    const hitSurface = new THREE.Mesh(geometry);
    hitSurface.name = 'hitSurface';
    mesh.add(hitSurface);

    return mesh;
  }

  highlight(value: boolean = true, hitSurface?: THREE.Object3D) {
    this.material.visible = value;
    super.highlight(value, hitSurface);
  }

  autoPlace() {
    this.placeAt(new THREE.Vector3(0, 1.37, -1.95));
  }

  onTriggerDown(hitSurface: THREE.Object3D) {
    console.log('Server button');

    ActivityLog.sendActivity();
    ActivityLog.sendResults();
  }
}
