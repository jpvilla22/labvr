import { Clock } from '../utils/Clock';
import { SimpleLabObject } from './SimpleLabObject';

export class Burner extends SimpleLabObject {
  grabbable: boolean = false;

  private fire: THREE.Object3D;

  constructor(obj: THREE.Object3D) {
    super(obj);

    this.fire = this.object.getObjectByName('fire');
    this.toggleFire(false);
  }

  get isOn() {
    return this.fire.visible;
  }

  update() {
    if (this.isOn) {
      const scale = ((Clock.elapsed % 0.3) / 0.3) * 0.2 + 1;
      this.fire.scale.setY(scale);
    }
  }

  onTriggerDown(): void {
    this.toggleFire();
  }

  toggleFire(on = !this.isOn) {
    this.fire.visible = on;
  }
}
