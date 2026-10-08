import { StandaloneHeader } from "./StandaloneHeader";

export function SecurityPolicy() {
  return (
    <>
      <StandaloneHeader label="Security Policy" />
      <main class="grid min-w-0 gap-6 wrap-break-word">
        <h1 class="text-3xl text-main">Security Policy</h1>
        <p>
          Oxytype handles security reports through its own repository. Please
          read the current repository security policy for private reporting
          instructions.
        </p>
        <p>Do not post vulnerability details in a public issue.</p>
        <p>
          <a
            class="text-main underline"
            href="https://github.com/voltcrash/oxytype/security/policy"
          >
            Read the security policy
          </a>
        </p>
        <a class="text-sub underline" href="/">
          Back to Oxytype
        </a>
      </main>
    </>
  );
}
