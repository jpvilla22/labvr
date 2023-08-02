import * as THREE from 'three';
import fragShader from './shaders/PlaceholderShader.frag';
import vertShader from './shaders/PlaceholderShader.vert';

export class PlaceholderMaterial extends THREE.ShaderMaterial {
  constructor(obj: THREE.Mesh) {
    const { geometry } = obj;

    if (!geometry) throw Error(`Object ${obj.name} has no geometry; PlaceholderMaterial needs a mesh with geometry`);

    if (!geometry.boundingBox) geometry.computeBoundingBox();

    const box = geometry.boundingBox;

    super({
      uniforms: {
        yMin: { value: box.min.y },
        yMax: { value: box.max.y },
      },
      vertexShader: vertShader,
      fragmentShader: fragShader,
      transparent: true,
      depthWrite: false
    });
  }
}
