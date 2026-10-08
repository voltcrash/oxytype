import { Fa } from "../common/Fa";
import { StandaloneHeader } from "./StandaloneHeader";

export function StandaloneNotFound() {
  return (
    <>
      <StandaloneHeader focus homeLink />
      <main class="h-full">
        <div
          class="page page404 grid h-full content-center justify-center"
          id="page404"
        >
          <div class="content grid w-full max-w-[300px] gap-8 md:max-w-none md:grid-flow-col md:grid-cols-[300px_300px] md:gap-16">
            <img
              src="/images/oxytype-404.svg"
              alt="Oxytype typing keys"
              class="image aspect-[300/199] w-full self-center rounded"
            />
            <div class="side grid justify-items-center gap-4 text-center">
              <div class="title self-center text-[5rem] leading-[4rem] text-main">
                404
              </div>
              <div>
                Ooops! Looks like this page or resource doesn&apos;t exist.
              </div>
              <a
                href="/"
                class="button w-max rounded bg-sub-alt px-8 py-4 text-text no-underline hover:bg-text hover:text-bg"
                router-link=""
              >
                <Fa icon="fa-home" /> Go Home
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
