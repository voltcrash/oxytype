import { twMerge } from "tailwind-merge";
import { ClassValue, clsx } from "clsx";

export function cn(...input: ClassValue[]): string {
  return twMerge(clsx(...input));
}

// Preserve existing display utilities when imperative animations toggle hidden.
export function updateClassNames(
  current: string,
  names: string,
  enabled: boolean,
): string {
  const classes = current.split(/\s+/).filter(Boolean);
  const changes = names.split(/\s+/).filter(Boolean);
  return enabled
    ? [...new Set([...classes, ...changes])].join(" ")
    : classes.filter((name) => !changes.includes(name)).join(" ");
}
