import { useQuery } from "@tanstack/solid-query";
import { For, JSXElement, Show } from "solid-js";

import { getVersionHistoryQueryOptions } from "../../queries/public";
import { isModalOpen } from "../../states/modals";
import { cn } from "../../utils/cn";
import { AnimatedModal } from "../common/AnimatedModal";
import AsyncContent from "../common/AsyncContent";
import { Button } from "../common/Button";

export function VersionHistoryModal(): JSXElement {
  const isOpen = (): boolean => isModalOpen("VersionHistory");

  const releases = useQuery(() => ({
    ...getVersionHistoryQueryOptions(),
    enabled: isOpen(),
  }));

  return (
    <AnimatedModal id="VersionHistory" modalClass="max-w-6xl">
      <AsyncContent
        queries={{ releases }}
        errorMessage="Failed to load version history"
      >
        {({ releasesData }) => (
          <div class="releases">
            <Show
              when={releasesData().length > 0}
              fallback={<p class="text-sub">No releases published yet.</p>}
            >
              <For each={releasesData()}>
                {(release) => <ReleaseItem {...release} />}
              </For>
            </Show>
          </div>
        )}
      </AsyncContent>
      <div class="text-center">
        <Button
          variant="text"
          href="https://github.com/voltcrash/oxytype/releases"
          text="Older releases on GitHub"
          fa={{ icon: "fa-arrow-up-right-from-square" }}
        />
      </div>
    </AnimatedModal>
  );
}

function ReleaseItem(props: {
  name: string;
  publishedAt: string;
  bodyHTML: string;
}): JSXElement {
  return (
    <div class="grid gap-4">
      <div class="flex place-items-center justify-between">
        <div class="text-4xl text-main">{props.name}</div>
        <div class="text-sub">{props.publishedAt}</div>
      </div>
      <div
        class={cn(
          "grid gap-4",
          "[&_h3]:mt-4 [&_h3]:text-xl [&_h3]:text-sub [&_h3:first-child]:mt-0",
          "[&_ul]:grid [&_ul]:gap-1",
          "[&_li]:relative [&_li]:pl-[2ch] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['-']",
          "[&_code]:rounded [&_code]:bg-sub-alt [&_code]:px-1",
        )}
        // oxlint-disable-next-line solid/no-innerhtml
        innerHTML={props.bodyHTML}
      ></div>
      <div class="mt-4 mb-16 h-1 w-full rounded bg-sub-alt"></div>
    </div>
  );
}
