# October 2026 stack upgrade

Versions checked against stable npm releases on 1 October 2026. Node is pinned to the latest LTS, 24.21.0; Node typings stay on the matching 24 series (24.19.0).

Vite+ 1.0.0 manages runtime selection, installs, updates, builds, tests, linting, and formatting. The workspace uses pnpm 12.8.1, Turborepo 2.11.6, and a shared Vite+/Vitest catalog. All direct dependencies were checked; dependencies already at their latest stable release remain at that release.

| Technology | Version |
| --- | --- |
| TypeScript | 7.0.2 |
| Solid | 1.9.15 |
| Tailwind | 4.3.3 |
| TanStack Query | 5.104.0 |
| TanStack DB | 0.3.0 |
| TanStack Form | 1.33.5 |
| TanStack Table | 9.2.4 |
| TanStack Hotkeys | 0.12.1 |
| Hono | 4.13.12 |
| ts-rest | 3.52.1 |
| Zod | 4.6.5 |
| Better Auth | 1.7.7 |
| MongoDB driver | 7.7.0 |
| ioredis | 6.0.0 |
| BullMQ | 6.3.11 |
| Vitest | 5.0.3 |
| Playwright | 1.63.0 |
| Storybook | 10.6.1 |
| Testcontainers | 12.2.0 |
| Chart.js | 4.5.1 |
| Anime.js | 4.5.0 |
| Font Awesome | 7.3.1 |
| Howler | 2.2.4 |
| Sentry | 11.1.0 |
| Winston | 3.19.0 |
| Nodemailer | 10.0.13 |
| MJML | 5.4.1 |

## Compatibility changes

- Stable ts-rest 3.52.1 requires Zod's v3 schema API. Zod 4.6.5 includes that API at `zod/v3`; application schemas and three small dependency patches use it. Patch files are checked in and copied into Docker builds. Remove these shims when stable ts-rest and the related OpenAPI/search-parameter libraries support native Zod 4 schemas.
- TanStack Table 9 uses explicit features and a component-owned table instance. Form selectors, QueryClient calls, disabled DB queries, SlimSelect exports, UTC date types, and Anime callbacks use their current APIs.
- Chart.js 4 uses scale borders and requires a connected canvas. Cached Solid pages defer chart initialization until their canvas attaches, then disconnect their observer during initialization or cleanup.
- Sentry 11 data collection explicitly preserves the earlier restrictive defaults, following its [migration guide](https://github.com/getsentry/sentry-javascript/blob/develop/MIGRATION.md#senddefaultpii-is-replaced-by-datacollection).
- Better Auth runs inside Hono with MongoDB-backed credentials and sessions. BullMQ no longer creates obsolete queue schedulers. UAParser uses its v2 constructor.
- Font Awesome 7 styles, aliases, subsets, and generated icon types come from the package's official metadata. Regenerate types with `vp -C frontend run generate-icon-types`.
- MJML 5 renders asynchronously; email templates are awaited before Mustache substitution and delivery.
- Docker builders include every workspace manifest for pnpm 12's frozen-lockfile validation. Backend deployment permits patches belonging only to frontend dependencies to be unused in its production subset.

## Verification

```sh
vp install --frozen-lockfile
pnpm oxlint --type-aware --type-check --format agent
vp run build-pkg
vp run build-be
BACKEND_URL=http://localhost:5005 RECAPTCHA_SITE_KEY=verification vp run build-fe
vp -C frontend/storybook run build-storybook
vp test run --maxWorkers=2
```

Authentication setup is described in the contributor guide; frontend builds do not require auth credentials. Integration tests create disposable MongoDB/Redis containers. Files sharing a database run serially; the tests still exercise concurrent reward claims within each file.

Latest packages retain some older peer-version declarations: TypeScript 7 exceeds Madge/ESLint helper ranges; Storybook declares Vite+ 0.x and Vite+ declares browser-playwright 5.0.1. Actual builds and checks use Vite+ 1.0.0 and aligned Vitest 5.0.3 packages.

## Existing database volumes

Compose now pins MongoDB 9.0.2, Redis 8.10.2, and Traefik 3.7.13; frontend images use nginx 1.31.6 on Alpine 3.24. Existing MongoDB 5 volumes need staged upgrades and verified backups. Follow [self-hosting database upgrades](SELF_HOSTING.md#upgrading-database-containers) before starting the new images against existing data. Application tests do not migrate production volumes.
