import * as THREE from 'three';
import { SimpleLabObject } from './SimpleLabObject';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class Clock extends SimpleLabObject {
  readonly grabbable: boolean = false;
  experimentHour: number = 0;

  private onWaitCallback?: () => void;
  private displayMaterial: THREE.MeshStandardMaterial;

  constructor(obj: THREE.Object3D) {
    super(obj);

    const display = this.getObjectByPrefix('display') as THREE.Mesh;
    this.displayMaterial = display.material as THREE.MeshStandardMaterial;
    this.displayMaterial.color.set(0xeb2869);

    this.updateTime();
    setInterval(this.updateTime.bind(this), 60 * 1000);
  }

  onTriggerDown(hitSurface: THREE.Object3D): void {
    super.onTriggerDown(hitSurface);
    this.waitOneHour();
  }

  onWait(callback: () => void) {
    this.onWaitCallback = callback;
  }

  private waitOneHour() {
    this.experimentHour += 1;
    this.updateTime();

    this.onWaitCallback?.();
  }

  private updateTime() {
    const now = new Date();
    const hours = String(now.getHours() + this.experimentHour).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const text = `${hours}:${minutes}`;

    this.displayMaterial.map = MaterialLibrary.getInstance().generateTextMap(text, 'Clock');
    this.displayMaterial.needsUpdate = true;
  }
}
