import * as THREE from 'three';
import { LabObject } from '../objects/LabObject';
import { LabObjectType } from '../objects/LabObjectsFactory';
import { AnchorProps, AnchorsFactory } from './AnchorsFactory';
import { warn } from '../utils/logger';

export class AnchorPoint implements AnchorProps {
  static readonly SHOW_POINT = false;
  private static readonly DEFAULT_MINDISTANCE = 0.1;
  private static debugMesh: THREE.Mesh;

  quaternion: THREE.Quaternion; // World coordinates
  object: THREE.Object3D;
  includesOnly?: LabObjectType[];
  excludes?: LabObjectType[];
  minDistance: number;
  name: string;

  labObject: LabObject;
  private isEnabled: boolean = true;
  private onOccupiedCallback: () => void;
  private onFreedCallback: () => void;

  static create(obj: THREE.Object3D, name?: string) {
    const point = new AnchorPoint(obj, name);
    AnchorsFactory.addAnchor(point);
    return point;
  }

  static newDebugMesh(position = new THREE.Vector3()) {
    if (!this.debugMesh) {
      const geom = new THREE.SphereGeometry(0.01, 3, 3);
      const material = new THREE.MeshStandardMaterial({ color: 0xdd0022 });
      this.debugMesh = new THREE.Mesh(geom, material);
    }

    const mesh = this.debugMesh.clone();
    mesh.position.copy(position);
    return mesh;
  }

  private constructor(obj: THREE.Object3D, name?: string) {
    this.name = name || obj.name;
    this.quaternion = new THREE.Quaternion();
    this.minDistance = AnchorPoint.DEFAULT_MINDISTANCE;

    this.object = obj;
    obj.getWorldQuaternion(this.quaternion);
    obj.visible = AnchorPoint.SHOW_POINT;

    AnchorsFactory.populateAnchor(this);
  }

  get position() {
    return this.object.getWorldPosition(new THREE.Vector3());
  }

  get localPosition() {
    return this.object.position.clone();
  }

  get occupied() {
    return this.labObject != undefined;
  }

  get rotation() {
    let q = this.object.getWorldQuaternion(new THREE.Quaternion());
    return new THREE.Euler().setFromQuaternion(q);
  }

  get enabled() {
    return this.isEnabled;
  }

  onOccupupied(callback: () => void) {
    this.onOccupiedCallback = callback;
  }

  onFreed(callback: () => void) {
    this.onFreedCallback = callback;
  }

  place(labObject: LabObject) {
    // Although there are no hard restrictions, we will log warnings if something is off
    if (this.occupied) warn(`Anchor ${this.name} is occupied; object will still be placed on`);
    if (!this.enabled) warn(`Anchor ${this.name} is not enabled; object will still be placed on`);
    if (!this.includes(labObject))
      warn(`Anchor ${this.name} does not allow "${labObject.type}"; object will still be placed on`);

    // Orient object as the anchor orientation
    labObject.object.rotation.copy(labObject.getAnchoredRotation(this));

    // Now set the lab object position
    const pos = this.position.clone();
    const pCenter = labObject.baseWorldPosition;
    const pBase = labObject.object.getWorldPosition(new THREE.Vector3());
    pBase.sub(pCenter);
    pos.add(pBase);
    labObject.object.position.copy(pos);

    this.labObject = labObject;
    this.object.visible = false;

    this.onOccupiedCallback?.();
  }

  free() {
    this.labObject = undefined;
    this.object.visible = AnchorPoint.SHOW_POINT;

    this.onFreedCallback?.();
  }

  disable() {
    this.isEnabled = false;
    this.object.visible = false;
  }

  enable() {
    this.isEnabled = true;
    this.object.visible = AnchorPoint.SHOW_POINT;
  }

  includes(obj: LabObject) {
    if (this.includesOnly) return this.includesOnly.includes(obj.type);
    if (this.excludes) return !this.excludes.includes(obj.type);
    return true;
  }

  buildMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.01, 4, 3);
    const material = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.localPosition);
    mesh.visible = AnchorPoint.SHOW_POINT;
    return mesh;
  }
}
