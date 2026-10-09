import type { KeyEvent } from "@opentui/core";
import type { SingleListCommandLine } from "@oxytype/schemas/configs";

import { matchCommands } from "@oxytype/typing-core/command-matching";
import {
  batch,
  createContext,
  createMemo,
  createSignal,
  useContext,
  type Accessor,
} from "solid-js";

import type { Command, CommandGroup } from "./types";

import { createSelection, type Selection } from "../ui/selection";
import { createTextField, type TextField } from "../ui/text-field";

export type PaletteItem = Command & {
  /** "Parent › child" in the single list. */
  path: string;
  singleListDisplayNoIcon?: string;
};

export type Palette = {
  isOpen: Accessor<boolean>;
  open: (options?: { group?: CommandGroup; command?: Command }) => void;
  close: () => void;
  title: Accessor<string>;
  mode: Accessor<"search" | "input">;
  inputCommand: Accessor<Command | undefined>;
  field: TextField;
  error: Accessor<string | undefined>;
  busy: Accessor<boolean>;
  items: Accessor<PaletteItem[]>;
  selection: Selection;
  usingSingleList: Accessor<boolean>;
  run: (item?: PaletteItem) => Promise<void>;
  back: () => void;
  handleKey: (event: KeyEvent) => void;
};

/** Flattens subgroups like the web's single list command line. */
function flatten(group: CommandGroup): PaletteItem[] {
  return group.list.flatMap((command): PaletteItem[] => {
    if (command.subgroup === undefined) {
      return [{ ...command, path: command.display }];
    }
    const parent = command.display.replace(/\s?\.\.\.$/, "");
    return command.subgroup().list.map((child) => ({
      ...child,
      path: `${parent} › ${child.display}`,
      singleListDisplayNoIcon: `${parent} ${child.display}`,
      alias:
        [command.alias, child.alias].filter(Boolean).join(" ") || undefined,
      available: () =>
        (command.available?.() ?? true) && (child.available?.() ?? true),
    }));
  });
}

/** Web command palette behaviour: nested lists, inputs and filtering. */
export function createPalette(options: {
  root: () => CommandGroup;
  singleList: () => SingleListCommandLine;
  onError?: (message: string) => void;
}): Palette {
  const [isOpen, setOpen] = createSignal(false);
  const [stack, setStack] = createSignal<CommandGroup[]>([]);
  const [override, setOverride] = createSignal(false);
  const [mode, setMode] = createSignal<"search" | "input">("search");
  const [inputCommand, setInputCommand] = createSignal<Command>();
  const [error, setError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  const [listVersion, setListVersion] = createSignal(0);
  const field = createTextField();
  const query = (): string => (mode() === "search" ? field.value() : "");
  const usingSingleList = (): boolean =>
    !override() &&
    stack().length <= 1 &&
    (options.singleList() === "on" || query().startsWith(">"));
  const allItems = createMemo((): PaletteItem[] => {
    listVersion();
    const group = stack().at(-1);
    if (group === undefined) return [];
    return usingSingleList()
      ? flatten(group)
      : group.list.map((command) => ({ ...command, path: command.display }));
  });
  const items = createMemo((): PaletteItem[] => {
    const list = allItems();
    if (usingSingleList() && query().replace(/^>/, "").trim() === "") {
      return [];
    }
    const found = matchCommands(
      list,
      list.map((command) => command.available?.() ?? true),
      query(),
      usingSingleList(),
    );
    return list.filter((_, index) => found[index] === true);
  });
  const selection = createSelection(() => items().length, { wrap: true });

  function selectActive(): void {
    const active = items().findIndex((item) => item.active?.() === true);
    selection.set(
      !usingSingleList() && query() === "" && active >= 0 ? active : 0,
    );
  }
  function push(group: CommandGroup): void {
    batch(() => {
      setStack((current) => [...current, group]);
      field.set("");
      selectActive();
    });
  }
  function startInput(command: Command): void {
    batch(() => {
      setMode("input");
      setInputCommand(command);
      setError(undefined);
      field.set(command.input?.defaultValue?.() ?? "");
    });
  }
  function close(): void {
    batch(() => {
      setOpen(false);
      setStack([]);
      setMode("search");
      setInputCommand(undefined);
      setError(undefined);
      setOverride(false);
      field.set("");
    });
  }
  function back(): void {
    if (mode() === "input") {
      batch(() => {
        setMode("search");
        setInputCommand(undefined);
        setError(undefined);
        field.set("");
        selectActive();
      });
    } else if (stack().length > 1) {
      batch(() => {
        setStack((current) => current.slice(0, -1));
        field.set("");
        selectActive();
      });
    } else {
      close();
    }
  }
  async function guarded(operation: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await operation();
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : "Command failed";
      setError(message);
      options.onError?.(message);
    } finally {
      setBusy(false);
    }
  }
  async function run(item?: PaletteItem): Promise<void> {
    if (busy()) return;
    if (mode() === "input") {
      const command = inputCommand();
      if (command?.input === undefined) return;
      await guarded(async () => {
        const failure = await command.input?.submit(field.value());
        if (failure === undefined) close();
        else setError(failure);
      });
      return;
    }
    const command = item ?? items()[selection.index()];
    if (command === undefined || command.available?.() === false) return;
    if (command.input !== undefined) {
      startInput(command);
    } else if (command.subgroup !== undefined) {
      push(command.subgroup());
    } else {
      await guarded(async () => {
        await command.exec?.();
        if (command.sticky === true) setListVersion((it) => it + 1);
        else close();
      });
    }
  }
  return {
    isOpen,
    open: (openOptions = {}) => {
      batch(() => {
        close();
        setOpen(true);
        setOverride(openOptions.group !== undefined);
        setStack([openOptions.group ?? options.root()]);
        selectActive();
        if (openOptions.command !== undefined) startInput(openOptions.command);
      });
    },
    close,
    title: () =>
      mode() === "input"
        ? (inputCommand()?.input?.placeholder ?? inputCommand()?.display ?? "")
        : stack().length > 1 || override()
          ? (stack().at(-1)?.title ?? "")
          : "",
    mode,
    inputCommand,
    field,
    error,
    busy,
    items,
    selection,
    usingSingleList,
    run,
    back,
    handleKey: (event) => {
      if (event.eventType === "release") return;
      event.preventDefault();
      if (event.name === "escape") {
        back();
      } else if (event.name === "return") {
        void run();
      } else if (mode() === "search" && event.name === "tab") {
        selection.move(event.shift ? -1 : 1);
      } else if (mode() === "search" && selection.handleKey(event)) {
        return;
      } else if (field.handleKey(event)) {
        setError(undefined);
        if (mode() === "search") selection.set(0);
      }
    },
  };
}

export const PaletteContext = createContext<Palette>();
export function usePalette(): Palette | undefined {
  return useContext(PaletteContext);
}
