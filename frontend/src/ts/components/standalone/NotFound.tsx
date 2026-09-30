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
          <div class="content grid grid-flow-col grid-cols-[300px_300px] gap-16">
            <div class="image aspect-[300/199] w-full self-center rounded bg-[url('/images/monkeymeme.jpg')] bg-contain"></div>
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
