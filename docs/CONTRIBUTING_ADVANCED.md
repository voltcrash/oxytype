# Advanced development setup

Use Git, Node 24.21.0 and Vite+ (`vp`); pnpm 12.8.1 is the package manager
under the hood (pins in `.node-version`/`.nvmrc`/`packageManager`). On
Windows, disable Git autocrlf before cloning. Install dependencies with
`vp install --frozen-lockfile`. Shared packages export TypeScript source and
need no build.

For frontend-only work, `vp run dev-fe` starts Solid/Vite on port 3000. To run the
backend, copy `backend/.dev.vars.example` to `backend/.dev.vars`, apply local D1
migrations with `vp run --filter @oxytype/backend db:migrate`, then `vp run dev-be`.
Wrangler serves the API with local D1 on port 5005.
`vp run dev` starts the full workspace. Stop servers with Ctrl+C.

Google/GitHub login requires deployment-owned OAuth credentials/callbacks.
Email/password/reset flows remain disabled. See
[Cloudflare operations](CLOUDFLARE_OPERATIONS.md) for authentication, configuration,
Worker bindings, local data, integration setup and deployment.

For browser checks against the official Oxytype staging site, follow
[staging setup](STAGING_SETUP.md). Use its hosted URL for OAuth testing.

Use `vp lint --type-aware --type-check --format agent` for type checking;
`vp fmt` formats files. Commit hooks enforce formatting and lint.
Run a single test with `vp test run path/to/test.ts` from its package. Backend
`test` runs controllers/HTTP checks; `integration-test` runs workerd-backed D1
checks. Frontend imperative DOM work belongs in component refs/lifecycles; styling
uses Tailwind classes, `cn` and configured colors; icons use `Fa`.

Check unused code and dependencies:

```sh
TURNSTILE_SITE_KEY=1x00000000000000000000AA vp run knip
```

Knip loads the production Vite config, which requires a Turnstile site key.
The test key above is sufficient for analysis. Its workspace graph includes
tests, build plugins, CSS and maintenance scripts; review callers before removing
reported exports. Generated font CSS modules and the manual debug utility have
intentional ignores in `knip.json`.

See [contribution guidelines](CONTRIBUTING.md) and [architecture](ARCHITECTURE.md).

## Direct package-manager calls

Run everything through `vp` (`vp install`, `vp run`, `vp exec`, `vp dlx`,
`vp add`). Remaining direct calls, each required:

- Root `preinstall`: `npx only-allow pnpm`. Dependencies aren't installed yet,
  and `vp dlx` runs pnpm dlx, which overrides the user agent so the check always
  passes.
- `tui` scripts: `bun scripts/*.ts`, `bun run src/index.tsx`, `bun test`. Bun is
  the OpenTUI runtime; script-to-script calls still use `vp run`.
- `tui/scripts/smoke-package.ts`: `npm pack`/`npm install` mimic end-user npm
  installs of the published package.
- `tui-release.yml`: `npm publish` ships the prebuilt `tui/dist/npm` directory
  with npm provenance.
- End-user install docs: `bunx`/`bun add --global`/`npm install --global` for the
  published `@voltcrash/oxytype` package.
