import { LabObject } from './LabObject';
import { P100 } from './P100';
import { Erlenmeyer } from './Erlenmeyer';
import { PetriDish } from './PetriDish';
import { TestTube } from './TestTube';
import { TipsBox100 } from './TipsBox100';
import { WasteBin } from './WasteBin';
import { Spatula } from './Spatula';
import { TipsBox1000 } from './TipsBox1000';
import { ContainerObject } from './ContainerObject';
import { error } from '../utils/logger';
import { TubesHolder } from './TubesHolder';
import { Vortex } from './Vortex';
import { PetriCollection } from './PetriCollection';
import { Clock } from './Clock';
import { Burner } from './Burner';
import { Spectrophotometer } from './Spectrophotometer';
import { PlateStove } from './PlateStove';
import { StirringStove } from './StirringStove';
import { CompoundLabObject } from './CompoundLabObject';
import { DropperStand } from './DropperStand';
import { P1000 } from './P1000';
import { TVScreen } from './TVScreen';
import { PetriTray } from './PetriTray';
import { Cuvette } from './Cuvette';
import { ServerButton } from './ServerButton';
import { SpatulaTray } from './SpatulaTray';

const ObjectTypeMapping = {
  bin: WasteBin,
  burner: Burner,
  clock: Clock,
  cuvette: Cuvette,
  erlenmeyer: Erlenmeyer,
  p100: P100,
  p1000: P1000,
  petriCollection: PetriCollection,
  petriDish: PetriDish,
  plateStove: PlateStove,
  serverButton: ServerButton,
  spatula: Spatula,
  spatulaTray: SpatulaTray,
  spectrophotometer: Spectrophotometer,
  stand: DropperStand,
  stirringStove: StirringStove,
  tipsbox100: TipsBox100,
  tipsbox1000: TipsBox1000,
  tray: PetriTray,
  tube: TestTube,
  tubesHolder: TubesHolder,
  tv: TVScreen,
  vortex: Vortex,
} satisfies { [key: string]: typeof LabObject };

type MappedObjectType = keyof typeof ObjectTypeMapping;
type UnmappedObjectType = 'sphDoor' | 'sphKnob';

export type LabObjectType = MappedObjectType | UnmappedObjectType;

export namespace LabObjectsFactory {
  export const models = {} as { [key in LabObjectType]?: LabObject }; // Keep the first copy of each LabObject as model to clone others
  export const objects = {} as { [key in LabObjectType]?: LabObject[] }; // All objects present in scene

  export function allObjects() {
    return (Object.values(objects) as LabObject[][]).flat();
  }

  export function interactables() {
    const objects = allObjects() as LabObject[];

    const includeChildren = objects.reduce((all, labObj) => {
      all.push(labObj);
      if (labObj instanceof CompoundLabObject) all.push(...labObj.descendants);
      return all;
    }, []);

    return includeChildren.filter((obj) => obj.isInteractable && obj.interactionEnabled);
  }

  export function getObjectType(obj: THREE.Object3D): MappedObjectType {
    const types = Object.keys(ObjectTypeMapping);
    const result = types.find((type) => type == obj.name);
    return result as MappedObjectType;
  }

  export function isLabObject(obj: THREE.Object3D) {
    return getObjectType(obj) != undefined;
  }

  export function buildLabObjectFrom(obj: THREE.Object3D) {
    const type = getObjectType(obj) as MappedObjectType;

    const labObjectClass = ObjectTypeMapping[type];
    const newObject = labObjectClass ? new labObjectClass(obj) : undefined;

    if (!newObject) error(`LabObject ${obj.name} does not map to any class`);
    else if (!models[type]) models[type] = newObject;

    return newObject;
  }

  export function add(labObject: LabObject) {
    if (!objects[labObject.type]) objects[labObject.type] = [];

    objects[labObject.type].push(labObject);
    labObject.enable();
  }

  export function clear() {
    everything().forEach((obj) => obj.disable());

    // Clear objects
    Object.keys(objects).forEach((key: LabObjectType) => delete objects[key]);
  }

  export function update() {
    everything().forEach((obj) => {
      if (obj.active) obj.update();
    });
  }

  // Private stuff

  function everything(): LabObject[] {
    const allModels = Object.values(models) as LabObject[];
    return [...allModels, ...allObjects()];
  }
}
