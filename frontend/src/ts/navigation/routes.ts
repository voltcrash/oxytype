import { RouteDefinition } from "@solidjs/router";

import { PageName } from "../pages/page";

export type AppRouteInfo = {
  page: PageName;
  access?: "guest" | "user";
  redirect?: string;
};

// Keep frontend/firebase.json rewrites in sync when adding routes.
export const appRoutes = [
  { path: "/", info: { page: "test" } },
  { path: "/leaderboards", info: { page: "leaderboards" } },
  { path: "/about", info: { page: "about" } },
  { path: "/settings", info: { page: "settings" } },
  { path: "/login", info: { page: "login", access: "guest" } },
  { path: "/account", info: { page: "account", access: "user" } },
  {
    path: "/account-settings",
    info: {
      page: "settings",
      access: "user",
      redirect: "/settings?tab=account",
    },
  },
  { path: "/profile", info: { page: "profileSearch" } },
  { path: "/profile/:uidOrName", info: { page: "profile" } },
  { path: "/friends", info: { page: "friends", access: "user" } },
  { path: "*notFound", info: { page: "404" } },
] satisfies (RouteDefinition & { info: AppRouteInfo })[];
