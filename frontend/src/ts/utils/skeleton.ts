const skeletons = new Map<string, HTMLElement>();

export function save(id: string, removeAfter = true): void {
  const el = document.getElementById(id) ?? undefined;
  if (el === undefined) throw new Error(`Element with id ${id} not found`);
  skeletons.set(id, el);
  if (removeAfter) remove(id);
}

export function add(id: string): void {
  if (!has(id)) {
    save(id);
  }
}
export function remove(id: string): void {
  const popup = skeletons.get(id);
  if (popup) {
    popup.remove();
  } else {
    save(id, true);
  }
}

export type SkeletonAppendParents = keyof typeof parents;

const parents = { popups: "#popups", main: "main" };

export function append(id: string, parent: SkeletonAppendParents): void {
  let popup = skeletons.get(id) as HTMLElement;

  if (popup === undefined) {
    console.error(`Skeleton with id ${id} not found`);
  }
  document.querySelector(parents[parent])?.append(popup);
}

export function has(id: string): boolean {
  return skeletons.has(id);
}

export function get(id: string): HTMLElement {
  const element = skeletons.get(id) ?? document.getElementById(id);
  if (element === null) throw new Error(`Element with id ${id} not found`);
  return element;
}
