# Oxytype AI coding instructions

Be extremely concise. Follow [AGENTS.md](../AGENTS.md) for repository conventions.

## Architecture

pnpm/Vite+ workspace: SolidJS frontend, Hono backend on Cloudflare Workers
with D1 and Queues, and shared `@oxytype` packages. See
[architecture](../docs/ARCHITECTURE.md) and [development setup](../docs/CONTRIBUTING_ADVANCED.md).

Frontend UI uses `.tsx` components. Keep imperative DOM work inside
component-owned refs/lifecycles. Use Tailwind, `class`, `cn`, configured colors
and the `Fa` icon component.

## Checks

```sh
vp lint --type-aware --type-check --format agent
vp run build-fe
vp run build-be
```

Run a single test from its package with `vp test run path/to/test.ts`.
`vp run dev-fe` and `vp run dev-be` start the frontend and backend.

## Key files

- Root `package.json` scripts: `vp run` tasks. Shared packages export TS source; no build step.
- `frontend/src/ts/config/metadata.tsx`: config validation rules.
- `packages/contracts/src/index.ts`: API contracts.
- `packages/funbox/src/list.ts`: funbox definitions.
- `backend/src/api/ts-rest-adapter.ts`: typed controller adapter.
