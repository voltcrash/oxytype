import { JSXElement } from "solid-js";

import { AnimatedModal } from "../common/AnimatedModal";
import { Button } from "../common/Button";

export function ContactModal(): JSXElement {
  return (
    <AnimatedModal id="Contact" modalClass="max-w-4xl" title="Contact Oxytype">
      <p>
        Open an issue for bugs or account help. Use discussions for questions
        and ideas. Security reports should follow the repository security
        policy.
      </p>
      <p class="mt-4">
        The planned contact address is contact@voltcrash.com. It is not active
        yet.
      </p>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <Button
          variant="button"
          href="https://github.com/voltcrash/oxytype/issues/new/choose"
          text="Report a bug"
          fa={{ icon: "fa-bug", fixedWidth: true }}
        />
        <Button
          variant="button"
          href="https://github.com/voltcrash/oxytype/discussions"
          text="Ask a question"
          fa={{ icon: "fa-comments", fixedWidth: true }}
        />
        <Button
          variant="button"
          href="https://github.com/voltcrash/oxytype/security/policy"
          text="Security policy"
          fa={{ icon: "fa-shield-alt", fixedWidth: true }}
        />
      </div>
    </AnimatedModal>
  );
}
