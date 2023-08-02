export function any<T = any>(list: T[], condition: (e: T) => boolean = (e) => !!e): boolean {
  for (const element of list) {
    if (condition(element)) return true;
  }

  return false;
}
