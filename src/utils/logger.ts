import * as THREE from 'three';

const PX_PER_UNIT = 300;
const FONT_SIZE = 19;
const lines: string[] = [];

export const HTMLLogger = {
  width: 0,
  height: 0,

  buildMaterial(geometry: THREE.BufferGeometry): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.visibility = 'hidden';

    if (!geometry.boundingBox) geometry.computeBoundingBox();
    this.width = (geometry.boundingBox.max.x - geometry.boundingBox.min.x) * PX_PER_UNIT;
    this.height = (geometry.boundingBox.max.y - geometry.boundingBox.min.y) * PX_PER_UNIT;

    canvas.width = this.width;
    canvas.height = this.height;

    this.context = canvas.getContext('2d');
    this.context.font = `${FONT_SIZE}px Monospace`;

    this.texture = new THREE.CanvasTexture(canvas);
    let t = this.texture as THREE.Texture;
    t.repeat.set(1, -1);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;

    this.draw();

    const material = new THREE.MeshBasicMaterial({ map: this.texture });
    return material;
  },

  log(...msgs: any[]) {
    const message = msgs.map(String).join(' ');
    lines.push(...message.split('\n'));

    const maxLines = Math.floor(this.height / FONT_SIZE);
    if (lines.length > maxLines) lines.splice(0, lines.length - maxLines);

    if (this.context) this.draw();
  },

  clear() {
    lines.length = 0;
    this.draw();
  },

  draw() {
    // Clear
    const borderSize = 5;
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.fillStyle = 'white';
    this.context.fillRect(borderSize, borderSize, this.width - borderSize * 2, this.height - borderSize * 2);
    this.context.fillStyle = 'black';

    // Write lines
    lines.forEach((line, idx) => {
      this.context.fillText(line, 10, FONT_SIZE * (idx + 1));
    });

    this.texture.needsUpdate = true;
  },
};

export function htmlLog(...msgs: any[]) {
  HTMLLogger.log(...msgs);
}

export function error(...msgs: string[]) {
  console.error(...msgs);
}

export function warn(...msgs: string[]) {
  console.warn(...msgs);
}

export function info(...msgs: any[]) {
  console.log(...msgs);
}
