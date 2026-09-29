import { For, JSXElement, Show, createEffect, on } from "solid-js";

import {
  afterHideCommandline,
  onCommandlineBackdropClick,
  onCommandlineBeforeHide,
  onCommandlineEscape,
  onCommandlineInput,
  onCommandlineKeyDown,
  onSuggestionClick,
  onSuggestionMouseMove,
  prepareCommandline,
} from "../../commandline/commandline";
import {
  commandlineState,
  type CommandlineSuggestion,
} from "../../states/commandline";
import { cn } from "../../utils/cn";
import { AnimatedModal } from "../common/AnimatedModal";
import { Fa, type FaProps } from "../common/Fa";

const CHEVRON = '<i class="fas fa-fw fa-chevron-right chevronIcon"></i>';

function CommandIcon(props: { command: CommandlineSuggestion }): JSXElement {
  const showConfigIcon = (): boolean =>
    !commandlineState.usingSingleList &&
    ((props.command.subgroup === undefined &&
      props.command.configValue !== undefined) ||
      props.command.active !== undefined);
  const icon = (): string =>
    props.command.icon === undefined || props.command.icon === ""
      ? "fa-chevron-right"
      : props.command.icon;

  return (
    <div class="pointer-events-none text-sub [&_i]:mr-2">
      <Show
        when={!showConfigIcon()}
        fallback={
          <Show
            when={props.command.isActive}
            fallback={<span class="mr-2 inline-block w-[1.25em]"></span>}
          >
            <Fa icon="fa-check" fixedWidth />
          </Show>
        }
      >
        <Show
          when={icon().startsWith("fa-")}
          fallback={
            <div class="mr-2 inline-block w-[1.25em] text-center font-black tracking-[-0.1rem]">
              {icon()}
            </div>
          }
        >
          <Fa
            {...({
              icon: icon(),
              variant: props.command.iconType ?? "solid",
              fixedWidth: true,
            } as FaProps)}
          />
        </Show>
      </Show>
    </div>
  );
}

function CommandDisplay(props: { command: CommandlineSuggestion }): JSXElement {
  const parts = (): string[] =>
    (commandlineState.usingSingleList
      ? props.command.singleListDisplay === undefined ||
        props.command.singleListDisplay === ""
        ? props.command.display
        : props.command.singleListDisplay
      : props.command.display
    ).split(CHEVRON);

  return (
    <div class="pointer-events-none">
      <For each={parts()}>
        {(part, index) => (
          <>
            <Show when={index() > 0}>
              <Fa icon="fa-chevron-right" fixedWidth class="mx-2" />
              <Show
                when={
                  commandlineState.usingSingleList &&
                  (props.command.configValue !== undefined ||
                    props.command.active !== undefined)
                }
              >
                <Show
                  when={props.command.isActive}
                  fallback={<span class="mr-2 inline-block w-[1.25em]"></span>}
                >
                  <Fa icon="fa-check" fixedWidth />
                </Show>
              </Show>
            </Show>
            {part}
          </>
        )}
      </For>
    </div>
  );
}

function commandStyle(command: CommandlineSuggestion): string {
  if (!command.id.startsWith("setFontFamily")) {
    return command.customStyle ?? "";
  }
  let fontFamily = String(command.customData?.["name"] ?? "");
  if (fontFamily === "Helvetica") fontFamily = "Comic Sans MS";
  if (command.customData?.["isSystem"] === false) fontFamily += " Preview";
  return `font-family: '${fontFamily}'`;
}

function Suggestion(props: {
  command: CommandlineSuggestion;
  index: number;
}): JSXElement {
  const theme = (): boolean =>
    props.command.id.startsWith("changeTheme") &&
    props.command.customData !== undefined;
  const colors = (): Record<string, string | boolean> =>
    props.command.customData ?? {};

  return (
    <div
      class={cn(
        "command grid cursor-pointer grid-cols-[auto_1fr] px-4 py-2 text-xs leading-3 text-sub select-none [&_i]:text-sub",
        "last:rounded-b-[var(--roundness)] [&>div]:pointer-events-none",
        commandlineState.activeIndex === props.index &&
          "active bg-text text-bg [&_i]:text-bg!",
        theme() && "changeThemeCommand grid-cols-[auto_1fr_auto_auto]",
      )}
      data-command-id={props.command.id}
      data-index={props.index}
      style={commandStyle(props.command)}
    >
      <CommandIcon command={props.command} />
      <CommandDisplay command={props.command} />
      <Show when={theme()}>
        <div class={cn("mr-1", colors()["isFavorite"] !== true && "hidden")}>
          <Fa icon="fa-star" />
        </div>
        <div
          class="grid grid-flow-col place-content-center gap-2 rounded-2xl"
          style={{
            background: String(colors()["bg"]),
            outline: `0.25rem solid ${String(colors()["bg"])}`,
          }}
        >
          <For each={["main", "sub", "text"]}>
            {(key) => (
              <div
                class="size-4 rounded-full"
                style={{ background: String(colors()[key]) }}
              ></div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export function Commandline(): JSXElement {
  let inputEl: HTMLInputElement | undefined;

  createEffect(
    on(
      () => commandlineState.selectionNonce,
      () => {
        queueMicrotask(() => {
          if (!inputEl?.isConnected) return;
          if (commandlineState.selectAll) {
            inputEl.select();
          } else {
            const end = commandlineState.inputValue.length;
            inputEl.setSelectionRange(end, end);
          }
        });
      },
    ),
  );

  return (
    <AnimatedModal
      id="Commandline"
      focusFirstInput
      beforeShow={prepareCommandline}
      beforeHide={onCommandlineBeforeHide}
      afterHide={afterHideCommandline}
      onEscape={onCommandlineEscape}
      onBackdropClick={onCommandlineBackdropClick}
      wrapperClass={cn(
        "items-start px-8 py-24 transition-[background-color] duration-125",
        commandlineState.noBackground && "bg-transparent",
      )}
      modalClass={cn(
        "block max-w-[600px] gap-0 overflow-hidden rounded-[var(--roundness)] p-0 ring-0 transition-[box-shadow] duration-125",
        commandlineState.noBackground && "ring-[0.2em] ring-sub-alt",
        commandlineState.hasError &&
          "animate-[shake_0.1s_ease-in-out_infinite]",
      )}
    >
      <div class="grid grid-cols-[auto_1fr] items-center">
        <div class="col-start-1 row-start-1 mx-4 mt-px text-sub">
          <Fa
            {...({
              icon: commandlineState.inputIcon,
              fixedWidth: true,
            } as FaProps)}
          />
        </div>
        <Show when={commandlineState.checking}>
          <div class="col-start-1 row-start-1 mx-4 mt-px bg-bg text-sub">
            <Fa icon="fa-circle-notch" fixedWidth spin />
          </div>
        </Show>
        <input
          ref={(el) => {
            inputEl = el;
          }}
          type="text"
          class="col-start-2 w-full rounded-[var(--roundness)] border-0 bg-bg py-4 pr-4 pl-0 text-base text-text outline-none focus-visible:shadow-none"
          placeholder={commandlineState.inputPlaceholder}
          value={commandlineState.inputValue}
          onInput={onCommandlineInput}
          onKeyDown={(e) => void onCommandlineKeyDown(e)}
        />
      </div>
      <Show when={commandlineState.warning !== null}>
        <div class="grid grid-cols-[auto_1fr] bg-sub-alt py-2 text-xs text-error">
          <div class="mx-[1.15rem]">
            <Fa icon="fa-exclamation-triangle" fixedWidth />
          </div>
          <div>{commandlineState.warning}</div>
        </div>
      </Show>
      <div
        class="suggestions ffscroll grid max-h-[calc(100vh-15rem)] cursor-pointer overflow-y-scroll select-none"
        onMouseMove={(e) => void onSuggestionMouseMove(e)}
        onClick={(e) => void onSuggestionClick(e)}
      >
        <For each={commandlineState.suggestions}>
          {(command, index) => <Suggestion command={command} index={index()} />}
        </For>
      </div>
    </AnimatedModal>
  );
}
