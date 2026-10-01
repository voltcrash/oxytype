import {
  useBeforeLeave,
  useCurrentMatches,
  useIsRouting,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router";
import { batch, createEffect, createSignal, on, onCleanup } from "solid-js";

import * as PageController from "../../controllers/page-controller";
import { authEvent } from "../../events/auth";
import { navigationEvent, NavigateOptions } from "../../events/navigation";
import { isAuthAvailable } from "../../firebase";
import { canNavigate } from "../../navigation/guard";
import { bindNavigation, navigate } from "../../navigation/navigation";
import { AppRouteInfo } from "../../navigation/routes";
import { setAppLoading } from "../../states/app";
import { isAuthenticated } from "../../states/core";
import { showErrorNotification } from "../../states/notifications";

type NavigationRequest = {
  options: NavigateOptions;
  resolve: () => void;
  reject: (reason: unknown) => void;
};

export function NavigationRuntime(): null {
  const location = useLocation();
  const solidNavigate = useNavigate();
  const matches = useCurrentMatches();
  const params = useParams();
  const isRouting = useIsRouting();
  const [revision, setRevision] = createSignal(0);
  let ready = false;
  let replacingUrl = false;
  let pending: NavigationRequest | undefined;
  const urlReplacements = new Set<() => void>();
  let disposed = false;

  const currentUrl = () => location.pathname + location.search + location.hash;
  const path = (url: string): string => {
    const target = new URL(url || "/", window.location.origin);
    if (target.origin !== window.location.origin) {
      throw new Error("App navigation requires a same-origin URL");
    }
    return (
      (target.pathname.replace(/\/$/, "") || "/") + target.search + target.hash
    );
  };

  useBeforeLeave((event) => {
    if (replacingUrl) return;
    const options = pending?.options ?? {};
    if ((!options.force && isRouting()) || !canNavigate(options)) {
      event.preventDefault();
      pending?.resolve();
      pending = undefined;
    }
  });

  onCleanup(
    bindNavigation({
      navigate: async (url, options) => {
        if ((!options.force && isRouting()) || !canNavigate(options)) return;
        const target = path(url ?? currentUrl());
        await new Promise<void>((resolve, reject) => {
          batch(() => {
            pending?.resolve();
            pending = { options, resolve, reject };
            ready = true;
            solidNavigate(target, {
              resolve: false,
              scroll: false,
              state: target === currentUrl() ? location.state : undefined,
            });
            // Same-URL auth refreshes still run the page lifecycle.
            setRevision((value) => value + 1);
          });
        });
      },
      replaceUrl: async (url) => {
        const target = path(url);
        await new Promise<void>((resolve) => {
          batch(() => {
            urlReplacements.add(resolve);
            replacingUrl = true;
            try {
              solidNavigate(target, {
                resolve: false,
                replace: true,
                scroll: false,
                state: location.state,
              });
              setRevision((value) => value + 1);
            } finally {
              replacingUrl = false;
            }
          });
        });
      },
    }),
  );

  createEffect(
    on([currentUrl, isRouting, revision], () => {
      if (isRouting()) return;
      const urlOnly = urlReplacements.size > 0;
      for (const resolve of urlReplacements) resolve();
      urlReplacements.clear();
      // Filter/deep-link updates preserve the current page and its local state.
      if (!ready || (urlOnly && pending === undefined)) return;
      const match = matches().at(-1);
      if (match === undefined) return;
      const { page, access } = match.route.info as AppRouteInfo;
      const request = pending;
      const options = request?.options ?? {};

      const redirect =
        access === undefined
          ? undefined
          : !isAuthAvailable()
            ? "/"
            : access === "user" && !isAuthenticated()
              ? "/login"
              : access === "guest" && isAuthenticated()
                ? "/account"
                : undefined;
      if (redirect !== undefined) {
        solidNavigate(redirect, {
          resolve: false,
          replace: true,
          scroll: false,
          state: location.state,
        });
        return;
      }

      pending = undefined;
      void PageController.change(page, {
        ...options,
        ...(page === "profile"
          ? { force: true, params: { uidOrName: params["uidOrName"] ?? "" } }
          : page === "404"
            ? { force: true }
            : {}),
      }).then(
        () => request?.resolve(),
        (error: unknown) => {
          if (disposed) return;
          if (request !== undefined) request.reject(error);
          else showErrorNotification("Failed to navigate", { error });
        },
      );
    }),
  );

  navigationEvent.useListener(({ url, options }) => {
    void navigate(url, options);
  });
  authEvent.useListener((event) => {
    if (event.type !== "authStateChanged") return;
    void navigate(undefined, {
      force: true,
      loadingOptions: {
        loadingMode: () => (event.data.isUserSignedIn ? "sync" : "none"),
        loadingPromise: async () => {
          await event.data.loadPromise;
        },
        style: "bar",
        keyframes: [
          {
            percentage: 90,
            durationMs: 1000,
            text: "Downloading user data...",
          },
        ],
      },
    })
      .catch((error: unknown) => {
        showErrorNotification("Failed to navigate", { error });
      })
      .finally(() => {
        if (!disposed) setAppLoading(false);
      });
  });
  onCleanup(() => {
    disposed = true;
    pending?.resolve();
    for (const resolve of urlReplacements) resolve();
  });

  return null;
}
