import { JSXElement } from "solid-js";

import { AnimatedModal } from "../common/AnimatedModal";
import { Button } from "../common/Button";

export function SupportModal(): JSXElement {
  return (
    <AnimatedModal id="Support" title="Support Oxytype" modalClass="max-w-4xl">
      <p>
        Oxytype is an independent open source project. You can support it by
        contributing code, reporting bugs, or helping other users.
      </p>
      <div class="mt-4">
        <Button
          variant="button"
          href="https://github.com/voltcrash/oxytype"
          text="Contribute on GitHub"
          fa={{ icon: "fa-code", fixedWidth: true }}
        />
      </div>
    </AnimatedModal>
  );
}
