import type { KeyEvent } from "@opentui/core";
import { createContext, onCleanup, useContext } from "solid-js";

/** Call `event.preventDefault()` to stop global bindings handling the key. */
export type ScreenKeyHandler = (event: KeyEvent) => void;

export type KeyDispatcher = {
  register: (handler: ScreenKeyHandler) => () => void;
  dispatch: (event: KeyEvent) => void;
};

export function createKeyDispatcher(): KeyDispatcher {
  const handlers: ScreenKeyHandler[] = [];
  return {
    register: (handler) => {
      handlers.push(handler);
      return () => {
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
      };
    },
    dispatch: (event) => {
      // Newest first: the most recently mounted screen or overlay wins.
      for (const handler of handlers.toReversed()) {
        handler(event);
        if (event.defaultPrevented) return;
      }
    },
  };
}

export const KeyDispatcherContext = createContext<KeyDispatcher>();

export function useScreenKeys(handler: ScreenKeyHandler): void {
  const dispatcher = useContext(KeyDispatcherContext);
  if (dispatcher === undefined) {
    throw new Error("useScreenKeys outside KeyDispatcherContext");
  }
  onCleanup(dispatcher.register(handler));
}
