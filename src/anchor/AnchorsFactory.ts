import { LabObject } from '../objects/LabObject';
import { LabObjectType } from '../objects/LabObjectsFactory';
import { warn } from '../utils/logger';
import { AnchorPoint } from './AnchorPoint';

export const STIRRING_ANCHOR = 'stirringStoveAnchor';

export interface AnchorProps {
  includesOnly?: LabObjectType[];
  excludes?: LabObjectType[];
  minDistance?: number;
  area?: boolean;
}

export const AnchorTable: { [key: string]: AnchorProps } = {
  anchorStand: {
    includesOnly: ['p100', 'p1000'],
  },
  anchorSPH: {
    includesOnly: ['cuvette'],
  },
  tubeAnchor: {
    includesOnly: ['tube'],
  },
  collectionTableAnchor: {
    includesOnly: ['petriCollection'],
  },
  trayAnchor: {
    includesOnly: ['petriDish'],
  },
  petriAnchor: {
    includesOnly: ['petriDish'],
  },
  spatulaAnchor: {
    includesOnly: ['spatula'],
  },

  mainArea: {
    excludes: ['tube', 'p100', 'p1000'],
    area: true,
  },
  plateStoveHelper: {
    includesOnly: ['petriCollection'],
    area: true,
  },

  // Stirring stove shelf
  [STIRRING_ANCHOR]: {
    includesOnly: ['erlenmeyer'],
    area: true,
  },
};

export namespace AnchorsFactory {
  export const anchors: AnchorPoint[] = [];

  function getTableEntry(name: string): string | undefined {
    const entries = Object.keys(AnchorTable);
    return entries.find((key) => name.startsWith(key));
  }

  export function addAnchor(anchor: AnchorPoint) {
    anchors.push(anchor);
  }

  export function isAnchor(obj: THREE.Object3D): boolean {
    const key = getTableEntry(obj.name);
    return key && !AnchorTable[key].area;
  }

  export function isAnchorSurface(obj: THREE.Object3D): boolean {
    const key = getTableEntry(obj.name);
    if (!key) return false;
    else return !!AnchorTable[key].area;
  }

  export function anchorsFor(labObject: LabObject): AnchorPoint[] {
    return anchors.filter((anchor) => anchor.enabled && !anchor.occupied && anchor.includes(labObject));
  }

  export function populateAnchor(anchor: AnchorPoint) {
    const entry = getTableEntry(anchor.name);

    if (entry) {
      const values = AnchorTable[entry];
      anchor.includesOnly = values.includesOnly;
      anchor.excludes = values.excludes;
      if (values.minDistance) anchor.minDistance = values.minDistance;
    }
  }

  export function disableAll() {
    anchors.forEach((anchor) => anchor.disable());
  }

  export function enable(entry: string) {
    const enabled: AnchorPoint[] = [];

    anchors.forEach((anchor) => {
      if (anchor.name.startsWith(entry)) {
        anchor.enable();
        enabled.push(anchor);
      }
    });

    if (enabled.length == 0) warn(`No anchor '${entry}' was found`);

    return enabled;
  }

  export function disable(entry: string) {
    const enabled: AnchorPoint[] = [];

    anchors.forEach((anchor) => {
      if (anchor.name.startsWith(entry)) {
        anchor.disable();
        enabled.push(anchor);
      }
    });

    return enabled;
  }

  export function findAnchors(entry: string): AnchorPoint[] {
    return anchors.filter((anchor) => anchor.name.startsWith(entry));
  }
}
