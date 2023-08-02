import * as THREE from 'three';
import { Texture, CubeTexture, Material } from 'three';

export type TextureItem = {
  type: 'cubeMap' | 'map';
  files: string | string[];
  map: Texture | CubeTexture | null;
};

type TextureIndex = { [key: string]: TextureItem };

type MaterialIndex = { [key: string]: Material };

const materialsWithEnvMap = {
  steel: { map: 'greyRoom1' },
  steelCase: { map: 'greyRoom1' },
  stainlessSteel: { map: 'greyRoom1' },
  stainlessSteelInterior: { map: 'greyRoom1' },
  glass: { map: 'greyRoom1' },
  chrome: { map: 'greyRoom1' },
  steelStove: { map: 'greyRoom1' },
  chromeStove: { map: 'greyRoom1' },
  plastic: { map: 'greyRoom1' },
};

const FONT_PATH = 'public/fonts/';

export type TextMapTypes =
  | 'SPMDisplay'
  | 'StoveDisplay'
  | 'PetriCapLabel'
  | 'PetriSideLabel'
  | 'ErlenmeyerLabel'
  | 'TubeLabel'
  | 'Clock';

export class MaterialLibrary {
  private textures: TextureIndex = {
    greyRoom1: {
      type: 'cubeMap',
      files: [
        'greyRoom1_front.jpg',
        'greyRoom1_back.jpg',
        'greyRoom1_top.jpg',
        'greyRoom1_bottom.jpg',
        'greyRoom1_left.jpg',
        'greyRoom1_right.jpg',
      ],
      map: null,
    },
    colony1: {
      type: 'map',
      files: 'colony1.jpg',
      map: null,
    },
    uvChecker: {
      type: 'map',
      files: 'uv.jpg',
      map: null,
    },
  };

  private fonts = {
    CaveatBold: 'Caveat-Bold.ttf',
    SevenSegments: 'SevenSegments.ttf',
    MonospaceSevenSegments: 'MonospaceSevenSegments.ttf',
  };

  private renderer: THREE.WebGLRenderer;
  private secondaryScene: THREE.Scene;
  private orthoCam = new THREE.OrthographicCamera();
  private colonyMaterial: THREE.MeshBasicMaterial;
  private static instance: MaterialLibrary;

  public constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;

    MaterialLibrary.instance = this;
    let me = this;
    const width = 2;
    const height = 2;

    this.secondaryScene = new THREE.Scene();
    const gridHelper = new THREE.GridHelper(2, 4);
    gridHelper.rotation.x = Math.PI / 2;
    //this.secondaryScene.add(gridHelper);

    const light = new THREE.AmbientLight(0xffffff); // soft white light
    this.secondaryScene.add(light);

    this.orthoCam = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    this.orthoCam.position.set(0, 0, 10);
  }

  public static getInstance(): MaterialLibrary {
    return MaterialLibrary.instance;
  }

  async init() {
    let promises = [];
    promises.push(
      new Promise((resolve: Function, reject: Function) => {
        const manager = new THREE.LoadingManager();

        manager.onLoad = function () {};

        manager.onProgress = function (url, _itemsLoaded, _itemsTotal) {
          if (_itemsLoaded == _itemsTotal) {
            resolve();
          }
        };

        manager.onError = function (url) {
          let err = 'TextureLibrary there was an error loading ' + url;
          console.error(err);
          reject(err);
        };

        for (let [key, value] of Object.entries(this.textures)) {
          let ti = value as TextureItem;

          if (ti.type == 'cubeMap') {
            let cubemapLoader = new THREE.CubeTextureLoader(manager);
            cubemapLoader.setPath('public/maps/');

            cubemapLoader.load(
              ti.files as string[],
              (t) => {
                this.textures[key].map = t;
              },
              null,
              function (err) {
                console.error('CubeMapLoadeded error: ' + err);
              }
            );
          } else if ((value as TextureItem).type == 'map') {
            let loader = new THREE.TextureLoader(manager);

            loader.load(
              'public/maps/' + (ti.files as string),
              (t) => {
                console.log('loading map ' + (ti.files as string));
                this.textures[key].map = t;
              },
              null,
              function (err) {
                console.error('TextureLibrary error: ' + err);
              }
            );
          }
        }
      })
    );

    for (let [key, value] of Object.entries(this.fonts)) {
      let font = new FontFace(key, 'url(' + FONT_PATH + value + ')');
      let prom = new Promise((resolve: Function, reject: Function) => {
        font.load().then((loadedFont) => {
          document.fonts.add(loadedFont);

          /*
          const el = document.createElement('div');
          el.innerHTML = '12345678';
          el.style.fontFamily = key;
          el.style.fontSize = '30px';
          document.body.appendChild(el);
          */
          resolve();
        });
      });

      promises.push(prom);
    }
    return Promise.all(promises);
  }

  private prepareAssets() {
    this.colonyMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      //map: this.textures['uvChecker'].map,
      alphaMap: this.textures['colony1'].map,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
  }

  public generateTextMap(text: string, type: TextMapTypes) {
    let res = { w: 256, h: 256 };
    let fontName = 'Arial';
    let background = '#000000';
    let foreground = '#FFFFFF';
    let textHeight = 40; //pixels;
    let verticalOffset = 0;
    let horizontalOffset = 0;
    switch (type) {
      case 'Clock':
        res = { w: 256, h: 128 };
        fontName = 'MonospaceSevenSegments';
        background = '#111111';
        foreground = '#FFFFFF';
        textHeight = 25;
        verticalOffset = 45;
        horizontalOffset = -5;
        break;
      case 'SPMDisplay':
        res = { w: 256, h: 64 };
        fontName = 'SevenSegments';
        background = '#c9ffff';
        foreground = '#395a6e';
        textHeight = 50;
        verticalOffset = 3;
        break;
      case 'StoveDisplay':
        res = { w: 128, h: 64 };
        fontName = 'SevenSegments';
        background = '#200000';
        foreground = '#CC0000';
        textHeight = 50;
        verticalOffset = 3;
        break;
      case 'TubeLabel':
        res = { w: 128, h: 128 };
        fontName = 'CaveatBold';
        background = '#000000';
        foreground = '#FFFFFF';
        textHeight = 40;
        verticalOffset = -25;
        horizontalOffset = 12;
        break;
      case 'PetriCapLabel':
      case 'PetriSideLabel':
      case 'ErlenmeyerLabel':
        res = { w: 128, h: 64 };
        fontName = 'CaveatBold';
        background = '#000000';
        foreground = '#FFFFFF';
        textHeight = 50;
        verticalOffset = 3;
        horizontalOffset = -5;
        break;
    }
    const canvas = document.createElement('canvas');

    canvas.width = res.w;
    canvas.height = res.h;

    let context = canvas.getContext('2d');
    context.font = textHeight + 'px ' + fontName;

    let texture = new THREE.CanvasTexture(canvas);
    texture.userData.text = text;
    let t = texture as THREE.Texture;
    t.repeat.set(1, -1);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;

    context.fillStyle = background;
    context.fillRect(0, 0, res.w, res.h);
    context.fillStyle = foreground;

    let metrics = context.measureText(text);

    let x = (res.w - metrics.width) / 2;
    let y = (res.h - textHeight) / 2;
    context.textBaseline = 'bottom';
    context.strokeStyle = foreground;
    context.fillText(text, x + horizontalOffset, y + textHeight + verticalOffset);
    /*
    context.strokeStyle = '#FF0000';
    context.beginPath();
    context.rect(x, y, metrics.width, textHeight);
    context.stroke();
    */

    texture.flipY = true;
    texture.needsUpdate = true;

    return texture;
  }

  public updateSpecialMaterials(sceneNode: THREE.Object3D) {
    let materialsIndex: MaterialIndex = {};
    sceneNode.traverse((obj) => {
      if (obj.type == 'Mesh') {
        let mesh = obj as THREE.Mesh;
        this.addMaterialToIndex(materialsIndex, mesh.material);
      }
    });

    let matNames = Object.keys(materialsWithEnvMap);

    for (let [key, mat] of Object.entries(materialsIndex)) {
      if (matNames.indexOf(mat.name) > -1) {
        //let envMapProperties: any = materialsWithEnvMap[(mat.name as string)];
        let m: THREE.MeshStandardMaterial = mat as THREE.MeshStandardMaterial;
        //m.emissive.r = 1;
        //m.color.g = 0;
        //m.color.b = 0;
        if (m.hasOwnProperty('envMap')) {
          m.envMap = this.textures['greyRoom1'].map;
          //m.roughness = 0.01;
          //m.metalness = 0.9;
        }
      }
    }
  }

  private addMaterialToIndex(index: MaterialIndex, material: Material | Material[]) {
    if (Array.isArray(material)) {
      material.forEach((v, i) => {
        this.addMaterialToIndex(index, v);
      });
    } else {
      if (!index.hasOwnProperty(material.name) && material.name.length > 0) {
        index[material.name] = material;
      }
    }
  }

  public createColonyMaterial(total: number, isSpread: boolean = true): THREE.MeshPhongMaterial {
    const MAX_SHOWN_COLONIES = 2000;

    if (!this.colonyMaterial) this.prepareAssets();

    const qVertices = [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(-1, 1),

      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(1, 1),
    ];

    const qUvs = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1, 1),
      new THREE.Vector2(0, 1),

      new THREE.Vector2(0, 0),
      new THREE.Vector2(1, 0),
      new THREE.Vector2(1, 1),
    ];

    const coloniesGeo = new THREE.BufferGeometry();

    let totalVertices = 6 * total * 3;
    let totalUvs = 6 * total * 2;
    const vertices = new Float32Array(totalVertices);
    const uvs = new Float32Array(totalUvs);

    const MAX_RADIUS_FACTOR = isSpread ? 0.9 : 0.1;

    let baseScale = 0.02 + Math.max(0, Math.min(12000, total - MAX_SHOWN_COLONIES)) / (100 * 1000);

    let count = Math.min(MAX_SHOWN_COLONIES, total);

    for (let i = 0; i < count; i++) {
      const m1 = new THREE.Matrix3();

      let r = Math.pow(Math.random(), 0.5) * MAX_RADIUS_FACTOR;
      let a = Math.random() * Math.PI * 2;

      let x = r * Math.cos(a);
      let y = r * Math.sin(a);
      let ang = Math.random() * Math.PI * 2;
      let s = baseScale + 0.02 * Math.random();

      m1.scale(s, s);
      m1.translate(x, y);

      for (let j = 0; j < 6; j++) {
        let pos = qVertices[j].clone();
        let uv = qUvs[j];

        pos.applyMatrix3(m1);

        vertices[(i * 6 + j) * 3 + 0] = pos.x;
        vertices[(i * 6 + j) * 3 + 1] = pos.y;
        vertices[(i * 6 + j) * 3 + 2] = 0;

        uvs[(i * 6 + j) * 2 + 0] = uv.x;
        uvs[(i * 6 + j) * 2 + 1] = uv.y;
      }
    }

    //console.log("totVertices:" + totalVertices)

    coloniesGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    coloniesGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    let coloniesMesh = new THREE.Mesh(coloniesGeo, this.colonyMaterial);
    this.secondaryScene.add(coloniesMesh);

    const oldTarget = this.renderer.getRenderTarget();
    const oldClearColor = new THREE.Color();
    this.renderer.getClearColor(oldClearColor);
    this.renderer.setClearColor(0x333322);

    let targetOptions: THREE.WebGLRenderTargetOptions = {
      minFilter: THREE.LinearFilter, //important as we want to sample square pixels
      magFilter: THREE.LinearFilter, //
      format: THREE.RGBAFormat, //could be RGBAFormat
      type: THREE.UnsignedByteType, //important as we need precise coordinates (not ints)
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    };

    const target = new THREE.WebGLRenderTarget(512, 512, targetOptions);
    this.renderer.xr.enabled = false;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.secondaryScene, this.orthoCam);

    this.renderer.setRenderTarget(oldTarget);
    this.renderer.setClearColor(oldClearColor);
    this.renderer.xr.enabled = true;

    this.secondaryScene.remove(coloniesMesh);

    let mat: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      specular: 0xffffff,
      opacity: 0.8,
      map: target.texture,
      alphaMap: target.texture,
      transparent: true,
      shininess: 8,
      name: 'colonies-material',
      userData: { colonies: total },
    });

    return mat;
  }

  public getTexture(name: string) {
    let map;
    if (this.textures.hasOwnProperty(name)) {
      map = this.textures[name].map;
    }
    if (map) return map;
    else throw Error('MaterialLibrary getTexture() texture ' + name + ' not found');
  }
}
