import { FunboxName } from "@oxytype/schemas/configs";
import { createSignal } from "solid-js";

export const [getFunboxBodyClasses, setFunboxBodyClasses] = createSignal<
  string[]
>([]);
export const [getFunboxStylesheets, setFunboxStylesheets] = createSignal<
  { name: FunboxName }[]
>([]);
// Legacy activation adds this class once, and clear() never removes it.
export const [isFunboxReducedMotionIgnored, setFunboxReducedMotionIgnored] =
  createSignal(false);
// A fresh object restarts the scanline on repeated CRT application.
export const [getCrt, setCrt] = createSignal<object | null>(null);
export const [isReadAheadDisabled, setReadAheadDisabled] = createSignal(false);
export const [areWordsVisible, setWordsVisible] = createSignal(true);
export const [isWordsWrapperVisible, setWordsWrapperVisible] =
  createSignal(true);
