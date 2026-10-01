import { useInputListener } from "../../hooks/useInputListener";
import { onKeyup } from "../handlers/keyup";
import { onKeydown } from "../handlers/keydown";

export function bindKeyListeners(inputEl: HTMLTextAreaElement): void {
  useInputListener(inputEl, "keyup", async (event) => {
    console.debug("wordsInput event keyup", {
      event,
      key: event.key,
      code: event.code,
    });

    await onKeyup(event);
  });

  useInputListener(inputEl, "keydown", async (event) => {
    console.debug("wordsInput event keydown", {
      event,
      key: event.key,
      code: event.code,
    });

    await onKeydown(event);
  });
}
