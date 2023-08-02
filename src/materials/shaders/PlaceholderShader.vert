precision mediump float;

varying float yPosition;

void main() {
  yPosition = position.y;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}