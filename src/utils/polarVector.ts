import * as THREE from 'three';

export function polarVector(angle: number, radius = 1): THREE.Vector2 {
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  return new THREE.Vector2(x, y);
}
