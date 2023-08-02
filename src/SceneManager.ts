import * as THREE from 'three';
import * as dat from 'dat.gui';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { LabObject } from './objects/LabObject';
import { OnError, OnProgress } from './types/SceneManager';
import { error, htmlLog, HTMLLogger, warn } from './utils/logger';
import { MaterialLibrary } from './materials/MaterialLibrary';
import { LabObjectsFactory } from './objects/LabObjectsFactory';
import { AnchorPoint } from './anchor/AnchorPoint';
import { AnchorSurface } from './anchor/AnchorSurface';
import { findObjectBy } from './utils/findObjectBy';
import { TubesHolder } from './objects/TubesHolder';
import { PetriDish } from './objects/PetriDish';
import { PetriCollection } from './objects/PetriCollection';
import { AnchorsFactory, STIRRING_ANCHOR } from './anchor/AnchorsFactory';
import { StirringStove } from './objects/StirringStove';
import { Erlenmeyer } from './objects/Erlenmeyer';
import { Solution } from './Solution';
import { Clock } from './objects/Clock';
import { RecordingSheet } from './RecordingSheet';
import { PetriTray } from './objects/PetriTray';
import { TVScreen } from './objects/TVScreen';
import { Cuvette } from './objects/Cuvette';
import { PlateStove } from './objects/PlateStove';
import { ServerButton } from './objects/ServerButton';
import { ActivityLog } from './ActivityLog';
import { SpatulaTray } from './objects/SpatulaTray';

type SceneMode = 'dissolution' | 'selection';

export class SceneManager {
  private static readonly GLB_SCENE = 'public/models/labArchitecture.glb';
  private static readonly GLB_OBJECTS: string[] = [
    'public/models/labObjectsSet1.glb',
    'public/models/labObjectsSet2.glb',
  ];

  mbLoaded: number = 0; // MegaBytes loaded

  // Special objects
  scene: THREE.Scene;
  marker: THREE.Object3D;
  floor: THREE.Object3D;
  walkingArea: THREE.Box3;
  mode: SceneMode;

  private placeholders: THREE.Group;
  private labObjects: THREE.Group;
  private materialLibrary: MaterialLibrary;
  private currentPetris: PetriCollection;

  private onProgressCallback: OnProgress;
  private onErrorCallback: OnError;

  constructor(scene: THREE.Scene, materialLibrary: MaterialLibrary) {
    this.scene = scene;
    this.materialLibrary = materialLibrary;

    this.placeholders = new THREE.Group();
    this.placeholders.name = 'placeholders';
    this.scene.add(this.placeholders);

    this.labObjects = new THREE.Group();
    this.labObjects.name = 'labObjects';
    this.scene.add(this.labObjects);
  }

  // User can setup optional onProgress callback
  onProgress(callback: OnProgress) {
    this.onProgressCallback = callback;
    return this;
  }

  // Setup optional onError callback
  onError(callback: OnError) {
    this.onErrorCallback = callback;
    return this;
  }

  addLabObject(labObject: LabObject, addToScene = true) {
    if (!labObject) {
      warn('Trying to add "undefined" lab object');
      return;
    }

    if (addToScene) this.labObjects.add(labObject.object);

    if (labObject.grabbable) {
      const placeholder = labObject.placeholder;
      this.placeholders.add(placeholder);
    }

    LabObjectsFactory.add(labObject);
  }

  async loadModels() {
    const filepaths = [SceneManager.GLB_SCENE, ...SceneManager.GLB_OBJECTS];

    // Load GLBs
    const glbsPromises = filepaths.map(
      (filepath) =>
        new Promise<GLTF>((resolve, reject) => {
          const loader = new GLTFLoader();
          return loader.load(
            filepath,
            (gltf: GLTF) => {
              this.executeOnLoad(gltf);
              resolve(gltf);
            },
            this.executeOnProgress.bind(this),
            (err) => {
              reject(err);
              error(`Error loading GLB '${filepath}': ${err.message}`);
              this.onErrorCallback?.(err);
            }
          );
        })
    );

    // Wait for all promises to finish
    await Promise.all<GLTF>(glbsPromises);

    this.postprocessScene();
  }

  buildDebugGUI() {
    const options = {
      dissolution: () => {
        this.clearScene();
        this.populateDissolutionScene();
      },
      selection: () => {
        this.clearScene();
        this.populateSelectionScene();
      },
      debugDissolution: () => {
        this.clearScene();
        this.populateDissolutionScene();
        (window as any).populateDishes();
      },
      debugSelectionScene: () => {
        this.clearScene();
        (window as any).recordDebug();
        this.populateSelectionScene();
      },
      clear: this.clearScene.bind(this),
      populateDishes: () => {
        (window as any).populateDishes();
      },
    };

    const gui = new dat.GUI();

    gui.add(options, 'dissolution');
    gui.add(options, 'selection');
    gui.add(options, 'clear');
    gui.add(options, 'debugDissolution');
    gui.add(options, 'debugSelectionScene');
    gui.add(options, 'populateDishes');
  }

  private executeOnProgress(event: ProgressEvent<EventTarget>) {
    this.mbLoaded = event.loaded / 1024 ** 2;
    this.onProgressCallback?.(event);
  }

  private executeOnLoad(gltf: GLTF) {
    this.preprocessScene(gltf);

    // After preprocessing, gltf.scene might be left with no children
    if (gltf.scene.children.length > 0) this.scene.add(...gltf.scene.children);
  }

  private preprocessScene(gltf: GLTF): GLTF {
    this.materialLibrary.updateSpecialMaterials(gltf.scene);

    // We will iterate through the scene tree to populate objects and anchors
    const processChild = (child: THREE.Object3D) => {
      // Populate LabObjects
      if (LabObjectsFactory.isLabObject(child)) {
        const newLabObj = LabObjectsFactory.buildLabObjectFrom(child);
        child.removeFromParent();
        return;
      }

      // Populate walking area
      if (child.name.startsWith('walkingArea')) {
        const mesh = findObjectBy(child, (obj: THREE.Mesh) => obj.isMesh) as THREE.Mesh;
        const geometry = mesh.geometry;
        if (!geometry.boundingBox) geometry.computeBoundingBox();

        this.walkingArea = geometry.boundingBox.clone();
      }

      // Populate anchor points
      if (AnchorsFactory.isAnchor(child)) {
        AnchorPoint.create(child);
        return;
      }

      if (AnchorsFactory.isAnchorSurface(child)) {
        const mesh = findObjectBy(child, (obj: THREE.Mesh) => obj.isMesh) as THREE.Mesh;

        if (!mesh) {
          error(`AnchorSurface ${child.name} must include a mesh`);
        } else {
          AnchorSurface.create(mesh);
        }

        return;
      }

      // Hide helper materials
      let mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.isMeshStandardMaterial) {
          if (mat.name == 'helpers') mat.visible = false;
        }
      }

      const children = [...child.children];
      children.forEach((subchild) => processChild(subchild));
    };

    processChild(gltf.scene);

    return gltf;
  }

  private buildScene() {
    // Marker
    const markerGeo = new THREE.TorusGeometry(0.15, 0.02, 12, 24);
    markerGeo.rotateX(Math.PI / 2);
    markerGeo.translate(0, 0.01, 0);
    this.marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x00aaff }));
    this.marker.visible = false;
    this.scene.add(this.marker);

    //let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    //this.scene.add(ambientLight);

    const light = new THREE.HemisphereLight(0xffffff, 0xaaaacc, 0.4);
    this.scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight.position.set(0.1, 1, 0.5);
    this.scene.add(directionalLight);

    // Floor
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 20, 20).rotateX(-Math.PI / 2),
      new THREE.MeshPhongMaterial({
        color: 0x808080,
        transparent: true,
        opacity: 0.75,
      })
    );
    this.floor.position.y = -0.05;
    this.scene.add(this.floor);
  }

  private postprocessScene() {
    this.buildScene();

    LabObjectsFactory.buildLabObjectFrom(ServerButton.buildMesh());

    LabObjectsFactory.allObjects().forEach((labObject) => {
      labObject.object.removeFromParent();
    });

    // Setup logic when waiting an hour
    const clock = LabObjectsFactory.models.clock as Clock;
    clock.onWait(this.onHourWait.bind(this));

    RecordingSheet.clear();
    RecordingSheet.currentHour = 0;

    this.populateDissolutionScene();
  }

  private onHourWait() {
    const clock = LabObjectsFactory.models.clock as Clock;

    if (this.mode == 'dissolution') {
      RecordingSheet.setCurrentPetris(this.currentPetris.petris);
    }

    ActivityLog.sendActivity();

    RecordingSheet.currentHour = clock.experimentHour;

    this.clearScene();

    if (clock.experimentHour <= 2) {
      this.populateDissolutionScene();
    } else {
      this.populateSelectionScene();
    }
  }

  private clearScene() {
    this.placeholders.clear();
    this.labObjects.clear();
    LabObjectsFactory.clear();
    AnchorsFactory.disableAll();
    HTMLLogger.clear();
  }

  private populateDissolutionScene() {
    this.mode = 'dissolution';

    AnchorsFactory.enable('anchorStand');
    AnchorsFactory.enable('mainArea');
    AnchorsFactory.enable('anchorSPH');
    AnchorsFactory.enable(STIRRING_ANCHOR);
    AnchorsFactory.enable('tubeAnchor');
    AnchorsFactory.enable('collectionTableAnchor');

    // Machinery
    const plateStove = LabObjectsFactory.models.plateStove as PlateStove;
    this.addLabObject(plateStove);
    const stirringStove = LabObjectsFactory.models.stirringStove as StirringStove;
    this.addLabObject(stirringStove);
    const spectro = LabObjectsFactory.models.spectrophotometer;
    this.addLabObject(spectro);
    const vortex = LabObjectsFactory.models.vortex;
    this.addLabObject(vortex);
    vortex.placeAt(new THREE.Vector3(1.05, 0.98, -1.3));
    const clock = LabObjectsFactory.models.clock;
    this.addLabObject(clock);
    const tv = LabObjectsFactory.models.tv as TVScreen;
    tv.showLogger();
    this.addLabObject(tv);

    // Populate petri dishes
    const petri = LabObjectsFactory.models.petriDish as PetriDish;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        var dish = petri.clone() as PetriDish;
        this.addLabObject(dish);
      }
    }

    const petriCollection = LabObjectsFactory.models.petriCollection.clone() as PetriCollection;
    petriCollection.petris = LabObjectsFactory.objects.petriDish as PetriDish[];
    petriCollection.labelPetris();
    const pcAnchor = AnchorsFactory.anchors.find((a) => a.name.startsWith('collectionTableAnchor'));
    petriCollection.placeOnAnchor(pcAnchor);
    this.addLabObject(petriCollection);
    this.currentPetris = petriCollection;

    // Place objects
    const stand = LabObjectsFactory.models.stand;
    this.addLabObject(stand);

    const [p100Anchor, p1000Anchor] = AnchorsFactory.findAnchors('anchorStand');
    const p100 = LabObjectsFactory.models.p100;
    this.addLabObject(p100);
    p100.placeOnAnchor(p100Anchor);
    const p1000 = LabObjectsFactory.models.p1000;
    this.addLabObject(p1000);
    p1000.placeOnAnchor(p1000Anchor);

    const spatulaTray = LabObjectsFactory.models.spatulaTray as SpatulaTray;
    this.addLabObject(spatulaTray);
    spatulaTray.placeAt(new THREE.Vector3(0.32, 0.916, -1.8));

    const spatula = LabObjectsFactory.models.spatula;
    this.addLabObject(spatula);
    spatula.placeOnAnchor(spatulaTray.anchor);

    const tubesHolder = LabObjectsFactory.models.tubesHolder as TubesHolder;
    this.addLabObject(tubesHolder);
    tubesHolder.placeAt(new THREE.Vector3(0.05, 0.915, -1.76));
    const tipsbox100 = LabObjectsFactory.models.tipsbox100;
    this.addLabObject(tipsbox100);
    tipsbox100.placeAt(new THREE.Vector3(-0.46, 0.915, -1.76));
    const tipsbox1000 = LabObjectsFactory.models.tipsbox1000;
    this.addLabObject(tipsbox1000);
    tipsbox1000.placeAt(new THREE.Vector3(-0.65, 0.915, -1.76));
    const burner1 = LabObjectsFactory.models.burner.clone();
    this.addLabObject(burner1);
    burner1.placeAt(new THREE.Vector3(-0.43, 0.915, -1.39));
    const burner2 = LabObjectsFactory.models.burner.clone();
    this.addLabObject(burner2);
    burner2.placeAt(new THREE.Vector3(0.27, 0.915, -1.39));
    const bin = LabObjectsFactory.models.bin;
    this.addLabObject(bin);
    bin.placeAt(new THREE.Vector3(0.82, 0.915, -1.76));

    const cuvette = LabObjectsFactory.models.cuvette.clone();
    this.addLabObject(cuvette);
    cuvette.placeAt(new THREE.Vector3(-0.9, 0.915, -1.76));
    const blankCuvette = LabObjectsFactory.models.cuvette.clone() as Cuvette;
    blankCuvette.setSolution(new Solution('medio', 1, 1));
    this.addLabObject(blankCuvette);
    blankCuvette.placeAt(new THREE.Vector3(-0.95, 0.915, -1.76));

    // Erlenmeyers
    const precultive = LabObjectsFactory.models.erlenmeyer as Erlenmeyer;
    precultive.setLabel('PRE');
    precultive.setSolution(new Solution('precultivo'));
    this.addLabObject(precultive);
    precultive.placeOnAnchor(stirringStove.anchors[0]);

    const cultive = precultive.clone() as Erlenmeyer;
    cultive.setLabel('cultivo');
    this.addLabObject(cultive);

    if (RecordingSheet.currentHour == 0) {
      cultive.setSolution(new Solution('medio'));
      cultive.placeAt(new THREE.Vector3(-0.28, 0.915, -1.76));
      Erlenmeyer.cultive = cultive.solution;
    } else {
      cultive.setSolution(Erlenmeyer.cultive);
      cultive.placeOnAnchor(stirringStove.anchors[1]);
    }

    // Populate test tubes
    const tubes = tubesHolder.populateTubes();
    tubes.forEach((tube) => this.addLabObject(tube));
  }

  private populateSelectionScene() {
    this.mode = 'selection';

    // Machinery
    const spectro = LabObjectsFactory.models.spectrophotometer;
    this.addLabObject(spectro);
    const clock = LabObjectsFactory.models.clock;
    clock.interactionEnabled = false;
    this.addLabObject(clock);
    const tv = LabObjectsFactory.models.tv as TVScreen;
    tv.showChart();
    this.addLabObject(tv);

    const servBtn = LabObjectsFactory.models.serverButton.clone() as ServerButton;
    this.addLabObject(servBtn);
    servBtn.autoPlace();

    const tray = LabObjectsFactory.models.tray as PetriTray;
    const tray1 = tray.clone();
    tray1.trayNumber = 0;
    this.addLabObject(tray1);
    const tray2 = tray.clone();
    tray2.trayNumber = 1;
    this.addLabObject(tray2);
    const tray3 = tray.clone();
    tray3.trayNumber = 2;
    this.addLabObject(tray3);

    // Populate petri dishes
    const petriModel = LabObjectsFactory.models.petriDish as PetriDish;
    const collectionModel = LabObjectsFactory.models.petriCollection as PetriCollection;
    const petriCollections: PetriCollection[] = [];

    for (let i = 0; i < 3; i++) {
      var petris: PetriDish[] = [];
      const entry = RecordingSheet.getEntry(i);

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const idx = row * 3 + col;
          const petriState = entry.petrisStates[idx]; // || this.generateDebugState(i, idx);

          const dish = petriModel.clone() as PetriDish;
          if (petriState) dish.hydrate(petriState);
          this.addLabObject(dish);
          petris.push(dish);
        }
      }

      const collection = collectionModel.clone() as PetriCollection;
      petriCollections.push(collection);
      collection.object.translateX((i - 2) * 0.7);
      collection.object.translateZ(-0.15);
      collection.petris = petris;
      collection.createAnchors();
      this.addLabObject(collection);
      collection.interactionEnabled = false;
    }

    tray1.placeAt(new THREE.Vector3(-0.785, 0.92, -1.25));
    petriCollections[0].placeAt(new THREE.Vector3(-0.78, 0.92, -1.52));
    tray2.placeAt(new THREE.Vector3(-0.08, 0.92, -1.25));
    petriCollections[1].placeAt(new THREE.Vector3(-0.07, 0.92, -1.52));
    tray3.placeAt(new THREE.Vector3(0.61, 0.92, -1.25));
    petriCollections[2].placeAt(new THREE.Vector3(0.535, 0.92, -1.52));
  }
}
