precision mediump float;

uniform float yMin;
uniform float yMax;

varying float yPosition;

void main() {
  float range = yMax - yMin;
  float heightPercentage = (yPosition - yMin) / range;
  float opacity = 0.3 * (1.0 - (heightPercentage) * 0.6);

  gl_FragColor = vec4(0.0, 1.0, 1.0, opacity);
}