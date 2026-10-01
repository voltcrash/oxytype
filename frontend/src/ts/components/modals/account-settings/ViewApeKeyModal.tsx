import { createSignal } from "solid-js";

import { createEffectOn } from "../../../hooks/effects";
import {
  getLastGeneratedApeKey,
  setLastGeneratedApeKey,
} from "../../../states/account-settings";
import { hideModal, isModalOpen } from "../../../states/modals";
import { AnimatedModal } from "../../common/AnimatedModal";
import { Button } from "../../common/Button";
import { H2 } from "../../common/Headers";

export function ViewApeKeyModal() {
  let timeout: NodeJS.Timeout | undefined;
  const [isDisabled, setIsDisabled] = createSignal<boolean>(true);
  createEffectOn(
    () => isModalOpen("ViewApeKey"),
    (isOpen) => {
      if (!isOpen) {
        setLastGeneratedApeKey(undefined);
        return;
      }
      setIsDisabled(true);
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => setIsDisabled(false), 5000);
    },
  );

  return (
    <AnimatedModal
      id="ViewApeKey"
      closeOnEscape={!isDisabled()}
      closeOnWrapperClick={!isDisabled()}
    >
      <H2 text="API key" />
      <textarea class="h-25 opacity-100" disabled>
        {getLastGeneratedApeKey()}
      </textarea>
      <p>
        This is your new API key. Please keep it safe. You will only see it
        once!
      </p>
      <p>
        <strong>Note: </strong>
        API keys are disabled by default, you need to enable them before they
        can be used.
      </p>

      <Button
        onClick={() => hideModal("ViewApeKey")}
        text="close"
        disabled={isDisabled()}
      />
    </AnimatedModal>
  );
}
