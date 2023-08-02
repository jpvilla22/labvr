import * as THREE from 'three';
import { AnchorPoint } from './AnchorPoint';
import { zeroPad } from '../utils/zeroPad';
import { findObjectBy } from '../utils/findObjectBy';

export class AnchorSurface {
  public name: string;

  private object: THREE.Mesh;
  private pointsGroup: THREE.Group;

  private points: AnchorPoint[] = [];

  private tileSize: number;
  private boundingSquare = {
    yPosition: 0,
    min: { x: 0, z: 0 },
    max: { x: 0, z: 0 },
  }; // In local coords

  static create(obj: THREE.Mesh, name = obj.name, tileSize: number = 0.15): AnchorSurface {
    const surface = new AnchorSurface(obj, name, tileSize);
    surface.buildAnchorPoints();
    return surface;
  }

  private constructor(obj: THREE.Mesh, name = obj.name, tileSize: number = 0.15) {
    if (!obj.geometry) throw new Error(`Anchor surface object ${obj.name} is expected to have a geometry`);

    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();

    const box = obj.geometry.boundingBox.clone();
    const { min, max } = box;

    this.boundingSquare.yPosition = min.y; // Or max.y, mesh should be a plane
    this.boundingSquare.min.x = min.x;
    this.boundingSquare.min.z = min.z;
    this.boundingSquare.max.x = max.x;
    this.boundingSquare.max.z = max.z;

    this.tileSize = tileSize;

    this.object = obj;
    this.name = name;
    this.pointsGroup = new THREE.Group();
    this.pointsGroup.name = 'points';
    this.pointsGroup.visible = AnchorPoint.SHOW_POINT;
    this.object.add(this.pointsGroup);

    const helper = findObjectBy(this.object, (mesh: THREE.Mesh) => {
      const mat = mesh.material as THREE.Material;
      return mesh.isMesh && mat.name == 'helpers';
    }) as THREE.Mesh;

    if (helper) (helper.material as THREE.Material).visible = false;
  }

  get width() {
    return this.boundingSquare.max.x - this.boundingSquare.min.x;
  }

  get height() {
    return this.boundingSquare.max.z - this.boundingSquare.min.z;
  }

  get anchorPoints() {
    return [...this.points];
  }

  private buildAnchorPoints() {
    const step = this.tileSize;
    const bounds = this.boundingSquare;
    const y = this.boundingSquare.yPosition;
    let i = 1;

    for (let x = bounds.min.x + step / 2; x < bounds.max.x; x += step) {
      for (let z = bounds.min.z + step / 2; z < bounds.max.z; z += step) {
        const name = `${this.name}-${zeroPad(i++, 2)}`;
        const anchorObj = AnchorPoint.newDebugMesh();
        anchorObj.position.set(x, y, z);
        anchorObj.name = name;
        this.pointsGroup.add(anchorObj);
        this.points.push(AnchorPoint.create(anchorObj));
      }
    }
  }
}
