import * as THREE from 'three';
import { findObjectBy } from '../utils/findObjectBy';
import { SimpleLabObject } from './SimpleLabObject';
import { LabObjectsFactory } from './LabObjectsFactory';
import { PetriDish } from './PetriDish';
import { error } from '../utils/logger';
import { RecordingSheet } from '../RecordingSheet';
import { AnchorPoint } from '../anchor/AnchorPoint';
import { any } from '../utils/any';

export class PetriCollection extends SimpleLabObject {
  private oldPetriParent: THREE.Object3D;
  private ungroupedHitSurface: THREE.Object3D;
  private groupedHitSurface: THREE.Mesh;
  private dishes: PetriDish[] = [];

  constructor(obj: THREE.Object3D) {
    super(obj);

    // Build hit surface from object's mesh
    const debugMaterial = new THREE.MeshBasicMaterial({ color: 0x999999 });
    const hitSurfaceGeom = (this.object as THREE.Mesh).geometry;
    if (!hitSurfaceGeom) error(`PetriCollection must be made of an object with a geometry`);

    this.ungroupedHitSurface = new THREE.Mesh(hitSurfaceGeom, debugMaterial);
    this.ungroupedHitSurface.name = 'ungroupedHitSurface';
    this.ungroupedHitSurface.visible = false;
    this.object.add(this.ungroupedHitSurface);
    this.hitSurfaces = [this.ungroupedHitSurface];

    // Build grouped hit surface
    const petriHeight = 0.015;
    const petriDiameter = 0.1;
    const boxHeight = petriHeight * 6.1;
    const boxSide = petriDiameter * 1.1;

    const groupedGeom = new THREE.BoxGeometry(boxSide, boxHeight, boxSide);
    groupedGeom.translate(0, boxHeight / 2, 0);
    this.groupedHitSurface = new THREE.Mesh(groupedGeom);
    this.groupedHitSurface.name = 'groupedHitSurface';
    this.groupedHitSurface.visible = false;
    this.object.add(this.groupedHitSurface);
  }

  get petris(): PetriDish[] {
    return [...this.dishes];
  }

  set petris(petris: PetriDish[]) {
    this.dishes.push(...petris);
    this.arrangePetris();
  }

  highlight(value?: boolean) {
    this.dishes.forEach((petri) => petri.highlight(value));
  }

  onTriggerDown(hitSurface: THREE.Object3D<THREE.Event>): void {
    if (any(this.dishes, (dish) => dish.isOpened)) {
      this.dishes.forEach((petri) => petri.close());
    } else {
      this.dishes.forEach((petri) => petri.open());
    }
  }

  onGripDown() {
    this.groupDishes();
  }

  onReleased() {
    if (this.anchored?.name.startsWith('collectionTableAnchor')) {
      this.dishes.forEach((petri) => {
        petri.interactionEnabled = true;
        this.oldPetriParent.add(petri.object);
      });

      this.arrangePetris();
      this.hitSurfaces = [this.ungroupedHitSurface];
      this.oldPetriParent = undefined;
    } else {
      this.hitSurfaces = [this.groupedHitSurface];
    }
  }

  groupDishes() {
    const petriHeight = 0.015;
    if (!this.oldPetriParent) this.oldPetriParent = this.dishes[0].object.parent;

    this.dishes.forEach((petri, idx) => {
      petri.close();
      this.object.add(petri.object);
      petri.object.position.set(0, (idx + 0.5) * petriHeight, 0);
      petri.interactionEnabled = false;
    });
  }

  arrangePetris() {
    const mesh = findObjectBy(this.object, (obj: THREE.Mesh) => obj.isMesh) as THREE.Mesh;
    const center = this.object.getWorldPosition(new THREE.Vector3());
    const petriDiameter = 0.1;

    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const width = box.max.x - box.min.x - 0.03 - petriDiameter;
    const depth = box.max.z - box.min.z - 0.02 - petriDiameter;

    const rows = 2;
    const columns = 3;
    this.dishes.forEach((petri, idx) => {
      const row = idx % rows;
      const col = Math.floor(idx / rows);

      const newPosition = center.clone();
      newPosition.x += width * (col / (columns - 1) - 0.5);
      newPosition.z += depth * (row / (rows - 1) - 0.5);

      petri.removeFromAnchored();
      petri.object.position.copy(newPosition);
      petri.close();
    });
  }

  labelPetris() {
    this.dishes.forEach((petri, idx) => {
      const id = -Math.floor(idx / 2) - 4;
      const label = `t${RecordingSheet.currentHour} ${id}`;
      petri.setLabel(label);
    });
  }

  createAnchors() {
    this.petris.forEach((petri) => {
      const position = petri.baseWorldPosition.clone();
      const anchorMesh = AnchorPoint.newDebugMesh(position);
      const anchor = AnchorPoint.create(anchorMesh, 'petriAnchor');
      this.object.attach(anchor.object);
      petri.placeOnAnchor(anchor);
    });
  }

  disable() {
    super.disable();
    this.dishes = [];
  }

  protected buildPlaceholder(): THREE.Object3D {
    // Generate placeholders
    const petriHeight = 0.015;
    const petri = LabObjectsFactory.objects.petriDish[0] as PetriDish;

    if (!this.placeholderMesh) this.placeholderMesh = new THREE.Mesh();
    this.placeholderMesh.geometry.dispose();
    this.placeholderMesh.geometry = new THREE.BufferGeometry();

    for (let i = 0; i < 6; i++) {
      const cloned = petri.placeholder.clone();
      cloned.visible = true;
      this.placeholderMesh.add(cloned);
      cloned.position.set(0, petriHeight * (i + 0.5), 0);
    }

    this.placeholderMesh.visible = false;
    return this.placeholderMesh;
  }
}
