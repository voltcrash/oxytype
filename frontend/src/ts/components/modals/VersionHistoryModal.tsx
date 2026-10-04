import { LiteDebouncer } from "@tanstack/pacer-lite/lite-debouncer";
import { useInfiniteQuery } from "@tanstack/solid-query";
import { For, JSXElement, Show } from "solid-js";

import { createEffectOn } from "../../hooks/effects";
import { useRef } from "../../hooks/useRef";
import { getVersionHistoryQueryOptions } from "../../queries/public";
import { getVersion } from "../../states/core";
import { isModalOpen } from "../../states/modals";
import { cn } from "../../utils/cn";
import { mergeReleasePages } from "../../utils/release-notes";
import { AnimatedModal } from "../common/AnimatedModal";
import AsyncContent from "../common/AsyncContent";
import { LoadingCircle } from "../common/LoadingCircle";

export function VersionHistoryModal(): JSXElement {
  const isOpen = (): boolean => isModalOpen("VersionHistory");

  const releases = useInfiniteQuery(() => ({
    ...getVersionHistoryQueryOptions(),
    enabled: isOpen(),
  }));

  // The footer can learn about a release before the cached list does.
  let refetchedFor = "";
  createEffectOn(
    () => [isOpen(), getVersion().text, releases.data] as const,
    ([open, latest, data]) => {
      if (!open || latest === "" || data === undefined) return;
      if (refetchedFor === latest) return;
      const listed = data.pages.some((page) =>
        page.releases.some((release) => release.name === latest),
      );
      if (listed) return;
      refetchedFor = latest;
      void releases.refetch();
    },
  );

  const debouncedFetch = new LiteDebouncer(
    (callback: () => void) => callback(),
    { wait: 150 },
  );

  const fetchMoreIfAtBottom = (element: HTMLElement): void => {
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight < 10 &&
      releases.hasNextPage &&
      !releases.isFetching
    ) {
      void releases.fetchNextPage();
    }
  };

  const fetchMoreVersions = (e: Event): void => {
    const element = e.target as HTMLElement;
    debouncedFetch.maybeExecute(() => fetchMoreIfAtBottom(element));
  };

  // Short release lists never scroll, so keep loading until the modal fills.
  const [listRef, listEl] = useRef<HTMLDivElement>();
  const fillModal = (): void => {
    requestAnimationFrame(() => {
      const modal = listEl()?.closest<HTMLElement>(".modal");
      // A hidden modal measures as empty, which would load every page.
      if (!isOpen() || !modal || modal.clientHeight === 0) return;
      fetchMoreIfAtBottom(modal);
    });
  };
  createEffectOn(() => [listEl(), releases.data] as const, fillModal);

  return (
    <AnimatedModal
      id="VersionHistory"
      modalClass="max-w-6xl"
      onScroll={fetchMoreVersions}
      afterShow={fillModal}
    >
      <AsyncContent
        queries={{ releases }}
        errorMessage="Failed to load version history"
      >
        {({ releasesData }) => (
          <>
            <div class="releases" ref={listRef}>
              <For each={mergeReleasePages(releasesData().pages)}>
                {(release) => <ReleaseItem {...release} />}
              </For>
            </div>

            <div class="mb-8 text-center text-2xl">
              <Show when={releases.isFetching}>
                <LoadingCircle color="sub" />
              </Show>
            </div>
          </>
        )}
      </AsyncContent>
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
