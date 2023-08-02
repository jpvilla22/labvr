import * as THREE from 'three';

const clock = new THREE.Clock();

export const Clock = {
  delta: 0, // Seconds
  elapsed: 0, // Seconds

  start() {
    clock.start();
  },

  update() {
    this.delta = clock.getDelta();
    this.elapsed = clock.elapsedTime;
  },
};
