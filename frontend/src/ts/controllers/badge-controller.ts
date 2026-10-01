import { JSX } from "solid-js/jsx-runtime";
import { FaSolidIcon } from "../types/font-awesome";

export type UserBadge = {
  id: number;
  name: string;
  description: string;
  icon?: FaSolidIcon;
  background?: string;
  color?: string;
  customStyle?: JSX.CSSProperties;
};

export const badges: Record<number, UserBadge> = {
  "-1": {
    id: -1,
    name: "none",
    description: "",
    icon: "fa-frown-open",
    color: "var(--text-color)",
    background: "var(--sub-color)",
  },
  1: {
    id: 1,
    name: "Developer",
    description: "I made this",
    icon: "fa-laptop",
    color: "white",
    customStyle: {
      animation: "rgb-bg 10s linear infinite",
      background:
        "linear-gradient(45deg in hsl longer hue, hsl(330, 90%, 30%) 0%, hsl(250, 90%, 30%) 100%)",
    },
  },
  2: {
    id: 2,
    name: "Collaborator",
    description: "I helped make this",
    icon: "fa-code",
    color: "white",
    customStyle: {
      animation: "rgb-bg 10s linear infinite",
      background:
        "linear-gradient(45deg in hsl longer hue, hsl(330, 90%, 30%) 0%, hsl(250, 90%, 30%) 100%)",
    },
  },
  4: {
    id: 4,
    name: "OG Account",
    description: "First 1000 users on the site",
    icon: "fa-baby",
    color: "var(--bg-color)",
    background: "var(--main-color)",
  },
  9: {
    id: 9,
    name: "White Hat",
    description: "Reported critical vulnerabilities on the site",
    icon: "fa-user-secret",
    color: "var(--bg-color)",
    background: "var(--main-color)",
  },
  10: {
    id: 10,
    name: "Bug Hunter",
    description: "Reported or helped track down bugs on the site",
    icon: "fa-bug",
    color: "var(--text-color)",
    background: "var(--sub-color)",
  },
  11: {
    id: 11,
    name: "Content Creator",
    description: "Verified content creator",
    icon: "fa-video",
    color: "var(--text-color)",
    background: "var(--sub-color)",
  },
  12: {
    id: 12,
    name: "Contributor",
    description: "Contributed to the site",
    icon: "fa-hands-helping",
    color: "var(--text-color)",
    background: "var(--sub-color)",
  },
  13: {
    id: 13,
    name: "Mythical",
    description: "Yes, I'm actually this fast",
    icon: "fa-rocket",
    color: "white",
    customStyle: {
      animation: "rgb-bg 10s linear infinite",
      background:
        "linear-gradient(45deg in hsl longer hue, hsl(330, 90%, 30%) 0%, hsl(250, 90%, 30%) 100%)",
    },
  },
  14: {
    id: 14,
    name: "All Year Long",
    description: "Reached a streak of 365 days",
    icon: "fa-fire",
    color: "var(--bg-color)",
    background: "var(--main-color)",
  },
};

export function getHTMLById(
  id: number,
  noText = false,
  noBalloon = false,
  showUnknown = false,
): string {
  const badge = badges[id];

  if (!badge && !showUnknown) {
    return "";
  }

  let style = "";
  if (badge?.background !== undefined) {
    style += `background: ${badge.background};`;
  }
  if (badge?.color !== undefined) {
    style += `color: ${badge.color};`;
  }
  if (badge?.customStyle !== undefined) {
    style += Object.entries(badge.customStyle)
      .map(([key, value]) => `${key}: ${value};`)
      .join(";");
  }

  const badgeName = badge?.name ?? "Badge Name Missing";
  const badgeDescription = badge?.description ?? "Badge Description Missing";

  const balloonText = (noText ? badgeName + ": " : "") + badgeDescription;

  let balloon = "";
  if (!noBalloon) {
    balloon = `aria-label="${balloonText}" data-balloon-pos="right"`;
  }

  let icon = "";
  if (badge?.icon !== undefined) {
    icon = `<i class="fas ${noText ? "fa-fw" : ""} ${badge.icon}"></i>`;
  } else {
    icon = `<i class="fas fa-question"></i>`;
  }

  const text = `<div class="text">${badgeName}</div>`;

  return `<div class="badge" ${balloon} style="${style}">${icon}${
    noText ? "" : text
  }</div>`;
}

export function getById(id: number): UserBadge | undefined {
  return badges[id];
}
