import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { AnchorPoint } from '../anchor/AnchorPoint';
import { PlaceholderMaterial } from '../materials/PlaceholderMaterial';
import { findObjectBy, findObjectByPrefix, findObjectsBy, findObjectsByPrefix } from '../utils/findObjectBy';
import { error, warn } from '../utils/logger';
import { HandController } from '../xr/HandController';
import { LabObjectType, LabObjectsFactory } from './LabObjectsFactory';
import { AnchorsFactory } from '../anchor/AnchorsFactory';
import { AnchorSurface } from '../anchor/AnchorSurface';

export type InteractionPoint = {
  name: string;
  object: THREE.Object3D;
  // minDistance: number;
};

export type IntersectionType = THREE.Intersection & {
  hitSurface: THREE.Object3D;
  labObject: LabObject;
};

export class LabObject {
  type: LabObjectType;
  object: THREE.Object3D;
  readonly grabbable: boolean = true;
  interactionEnabled: boolean = true;
  controller?: HandController;
  active: boolean = false; // Wether the object will update or not

  holdingPoint: THREE.Object3D;
  hitSurfaces: THREE.Object3D[] = [];
  anchored?: AnchorPoint;

  protected baseChild?: THREE.Object3D;
  protected interactionPoints: InteractionPoint[] = [];
  protected highlightMats: THREE.MeshStandardMaterial[] = [];
  protected placeholderMesh?: THREE.Mesh;

  protected static readonly HIGHLIGHT_COLOR = new THREE.Color(0x006600);

  constructor(obj: THREE.Object3D) {
    this.type = LabObjectsFactory.getObjectType(obj);
    this.object = obj;
  }

  get isInteractable(): boolean {
    return this.hitSurfaces.length > 0;
  }

  get grabbed(): boolean {
    return !!this.controller;
  }

  /** Returns the world position of every interaction point */
  get pointsPositions(): THREE.Vector3[] {
    return this.interactionPoints.map((point) => {
      const worldPos = new THREE.Vector3();
      point.object.getWorldPosition(worldPos);
      return worldPos;
    });
  }

  get basePosition() {
    return this.baseChild?.position.clone() || new THREE.Vector3();
  }

  get baseWorldPosition() {
    const result = new THREE.Vector3();

    if (this.baseChild) this.baseChild.getWorldPosition(result);
    else this.object.getWorldPosition(result);

    return result;
  }

  get worldPosition() {
    return this.object.getWorldPosition(new THREE.Vector3());
  }

  get placeholder() {
    if (!this.placeholderMesh) this.buildPlaceholder();
    return this.placeholderMesh;
  }

  rayIntersection(raycaster: THREE.Raycaster): IntersectionType | undefined {
    const intersections = raycaster.intersectObjects(this.hitSurfaces);

    if (intersections.length > 0) {
      return { ...intersections[0], hitSurface: intersections[0].object, labObject: this };
    } else {
      return undefined;
    }
  }

  placeAt(worldPosition: THREE.Vector3) {
    const newPosition = worldPosition.clone().sub(this.basePosition);
    this.object.parent.worldToLocal(newPosition);
    this.object.position.copy(newPosition);
  }

  // get the world position of the object so that that basepoint is place
  getAnchoredPosition(anchor: AnchorPoint): THREE.Vector3 {
    return anchor.position.clone().sub(this.basePosition);
  }

  getAnchoredRotation(anchor: AnchorPoint): THREE.Euler {
    return anchor.rotation;
  }

  getClosestAnchor(): AnchorPoint | undefined {
    const basePosition = this.baseWorldPosition;
    const freePoints = AnchorsFactory.anchorsFor(this).map((point) => ({
      point,
      distance: basePosition.distanceTo(point.position),
    }));

    const sorted = freePoints.sort((a, b) => a.distance - b.distance);
    const closest = sorted[0];

    if (!closest) return undefined;

    const distance = closest.point.position.distanceTo(basePosition);
    return distance <= closest.point.minDistance ? closest.point : undefined;
  }

  highlight(value: boolean = true, hitSurface?: THREE.Object3D) {
    this.highlightMats.forEach((mat) => {
      const emissive = value ? LabObject.HIGHLIGHT_COLOR : mat.userData.originalEmissive;
      mat.emissive = emissive;
    });
  }

  removeFromAnchored() {
    if (this.anchored) {
      this.anchored.free();
      this.anchored = undefined;
    }
  }

  placeOnAnchor(anchored: AnchorPoint) {
    if (anchored == undefined) {
      warn("Method 'placeOnAnchored' called with undefined anchor point");
      return;
    }

    this.removeFromAnchored();

    anchored.place(this);
    this.anchored = anchored;
  }

  clone(): LabObject {
    const cloneObj = this.object.clone();
    return LabObjectsFactory.buildLabObjectFrom(cloneObj);
  }

  enable(): void {
    this.active = true;
  }

  disable(): void {
    this.removeFromAnchored();
    this.object.removeFromParent();
    this.active = false;
  }

  update(): void {}

  onGripDown(): void {}

  onTriggerDown(hitSurface: THREE.Object3D): void {}

  onJoystickDown(): void {}

  onThumbButtonDown(): void {}

  whileGrabbed(): void {}

  onGrabbed(): void {}

  onDropped(): void {}

  onReleased(): void {}

  protected getInteractionPoint(name: string) {
    return this.interactionPoints.find((point) => point.name == name);
  }

  protected addInteractionPointsFromObject(...names: string[]) {
    const newPoints = [];

    for (let name of names) {
      const point = this.getObjectByPrefix(name);

      if (!point) {
        error(`Interaction point ${name} was not found for object ${this.type}`);
        continue;
      }

      const newPoint = { object: point, name };
      newPoints.push(newPoint);
      this.interactionPoints.push(newPoint);
    }

    return newPoints;
  }

  protected getObjectByRegex(regex: RegExp): THREE.Object3D | undefined {
    return findObjectBy(this.object, (child) => regex.test(child.name));
  }

  protected getObjectByPrefix(namePrefix: string): THREE.Object3D | undefined {
    return findObjectByPrefix(this.object, namePrefix);
  }

  protected getObjectsByPrefix(namePrefix: string): THREE.Object3D[] {
    return findObjectsByPrefix(this.object, namePrefix);
  }

  protected getOtherObjects(): LabObject[] {
    const all = Object.values(LabObjectsFactory.objects).flat();
    return all.filter((obj) => obj != this);
  }

  protected buildPlaceholder(): THREE.Object3D {
    function getAllGeometries(obj: THREE.Object3D, parent: THREE.Matrix4): THREE.BufferGeometry[] {
      const geometries: THREE.BufferGeometry[] = [];

      if (obj.name.startsWith('hitSurface')) return geometries;

      obj.updateMatrix();
      const transformation = parent.clone().multiply(obj.matrix);

      // Add current object's geometry
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const geom = mesh.geometry.clone();

        // Clean attributes
        const validAttrs = ['position', 'normal'];
        Object.keys(geom.attributes).forEach((attr) => {
          if (!validAttrs.includes(attr)) geom.deleteAttribute(attr);
        });

        // Apply transformation
        geom.applyMatrix4(transformation);
        geometries.push(geom);
      }

      // Add children geometries
      obj.children.forEach((child) => {
        geometries.push(...getAllGeometries(child, transformation));
      });

      return geometries;
    }

    // We merge all geometries into one
    const geometries = getAllGeometries(this.object, new THREE.Matrix4());
    const placeholderGeom = mergeBufferGeometries(geometries);

    const translation = this.object.position.clone().negate();
    placeholderGeom.translate(translation.x, translation.y, translation.z);

    this.placeholderMesh = new THREE.Mesh(placeholderGeom);
    this.placeholderMesh.name = `${this.object.name}-placeholder`;
    this.placeholderMesh.material = new PlaceholderMaterial(this.placeholderMesh);
    this.placeholderMesh.visible = false;

    return this.placeholderMesh;
  }

  protected buildAnchors(): AnchorPoint[] {
    const newAnchors: AnchorPoint[] = [];

    const anchorObjects = findObjectsBy(
      this.object,
      (child) => AnchorsFactory.isAnchor(child) || AnchorsFactory.isAnchorSurface(child),
      false
    );

    anchorObjects.forEach((obj) => {
      if (AnchorsFactory.isAnchor(obj)) {
        newAnchors.push(AnchorPoint.create(obj));
      } else if (AnchorsFactory.isAnchorSurface(obj)) {
        const surface = AnchorSurface.create(obj as THREE.Mesh);
        newAnchors.push(...surface.anchorPoints);
      }
    });

    return newAnchors;
  }

  protected populateHitSurfaces(deepSearch = true) {
    const checkHitSurface = (child: THREE.Object3D) => {
      if (child.name.startsWith('hitSurface')) {
        this.hitSurfaces.push(child);
        child.visible = false;
      }
    };

    if (deepSearch) this.object.traverse(checkHitSurface);
    else this.object.children.forEach(checkHitSurface);
  }
}
