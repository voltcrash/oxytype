# Advanced development setup

Use Git, Node 24.21.0 and pnpm 12.8.1 (pins in `.node-version`/`.nvmrc`). On
Windows, disable Git autocrlf before cloning. Install dependencies with
`pnpm install --frozen-lockfile`; build shared packages with `pnpm build-pkg`.

For frontend-only work, `pnpm dev-fe` starts Solid/Vite on port 3000. To run the
backend, copy `backend/.dev.vars.example` to `backend/.dev.vars`, apply local D1
migrations with `pnpm --filter @oxytype/backend db:migrate`, then `pnpm dev-be`.
Wrangler serves the API with local D1 on port 5005.
`pnpm dev` starts the full workspace. Stop servers with Ctrl+C.

Google/GitHub login requires deployment-owned OAuth credentials/callbacks.
Email/password/reset flows remain disabled. See
[Cloudflare operations](CLOUDFLARE_OPERATIONS.md) for authentication, configuration,
Worker bindings, local data, integration setup and deployment.

To target a remote API, set `BACKEND_URL` in `frontend/.env`; its value includes
`/api` when using the staging Worker. The backend's `FRONTEND_URL` must trust the
frontend origin. A same-site HTTPS proxy avoids third-party cookie restrictions.

Use `pnpm oxlint --type-aware --type-check --format agent` for type checking;
`pnpm exec vp fmt` formats files. Commit hooks enforce formatting and lint.
Run a single test with `pnpm vitest run path/to/test.ts` from its package. Backend
`test` runs controllers/HTTP checks; `integration-test` runs workerd-backed D1
checks. Frontend imperative DOM work belongs in component refs/lifecycles; styling
uses Tailwind classes, `cn` and configured colors; icons use `Fa`.

See [contribution guidelines](CONTRIBUTING.md) and [architecture](ARCHITECTURE.md).
