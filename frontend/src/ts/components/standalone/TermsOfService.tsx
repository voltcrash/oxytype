import { StandaloneHeader } from "./StandaloneHeader";

export function TermsOfService() {
  return (
    <>
      <StandaloneHeader label="Terms of Service" />
      <main class="grid gap-6">
        <h1 class="text-3xl text-main">Terms of Service</h1>
        <p>
          Oxytype terms are being prepared. The terms inherited from Monkeytype
          do not describe this independent project. Oxytype will publish its own
          terms before a public account service launches.
        </p>
        <p>For project questions, use the repository discussions.</p>
        <p>
          <a
            class="text-main underline"
            href="https://github.com/voltcrash/oxytype/discussions"
          >
            Visit project discussions
          </a>
        </p>
        <a class="text-sub underline" href="/">
          Back to Oxytype
        </a>
      </main>
    </>
  );
}
