/** Returns the first child (or the same given object) that meets the given criteria. */
export function findObjectBy(obj: THREE.Object3D, criteria: (child: THREE.Object3D) => boolean): THREE.Object3D {
  if (criteria(obj)) return obj;

  for (let child of obj.children) {
    const found = findObjectBy(child, criteria);
    if (found) return found;
  }

  return undefined;
}

/** Returns all children (or the same given object) that meet the given criteria.
 * @param searchChildren If true, the search will continue event for children of an object that matches the criteria
 */
export function findObjectsBy(
  obj: THREE.Object3D,
  criteria: (child: THREE.Object3D) => boolean,
  searchChildren = true
): THREE.Object3D[] {
  const result = [];

  if (criteria(obj)) {
    var matchedCriteria = true;
    result.push(obj);
  }

  if (!matchedCriteria || searchChildren) {
    for (let child of obj.children) {
      const found = findObjectsBy(child, criteria, searchChildren);
      if (found) result.push(...found);
    }
  }

  return result;
}

export function findObjectsByPrefix(obj: THREE.Object3D, prefix: string): THREE.Object3D[] {
  return findObjectsBy(obj, (child) => child.name.startsWith(prefix));
}

export function findObjectByPrefix(obj: THREE.Object3D, prefix: string): THREE.Object3D {
  return findObjectBy(obj, (child) => child.name.startsWith(prefix));
}
