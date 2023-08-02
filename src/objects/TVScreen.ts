import * as THREE from 'three';
import { HTMLLogger, error } from '../utils/logger';
import { LabObject } from './LabObject';
import { RecordingSheet } from '../RecordingSheet';

export class TVScreen extends LabObject {
  readonly grabbable: boolean = false;
  interactionEnabled: boolean = false;

  private loggerMaterial: THREE.Material;
  private chartMaterial: THREE.MeshStandardMaterial;
  private texture: THREE.Texture;

  constructor(obj: THREE.Object3D) {
    super(obj);

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) error(`TV Screen object must be a mesh with geometry`);

    this.loggerMaterial = HTMLLogger.buildMaterial(mesh.geometry);
    this.texture = RecordingSheet.generateTexture();
    this.chartMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.texture });

    this.showLogger();

    // Debug
    (window as any).tv = this;
  }

  showLogger() {
    (this.object as THREE.Mesh).material = this.loggerMaterial;
  }

  showChart() {
    (this.object as THREE.Mesh).material = this.chartMaterial;
  }

  updateChart() {
    this.texture.dispose();
    this.texture = RecordingSheet.generateTexture();
    this.chartMaterial.map = this.texture;
  }
}
