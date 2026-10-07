# Backend migration to Hono

> Historical migration notes. Current backend: [Cloudflare operations](CLOUDFLARE_OPERATIONS.md).

## Scope

Replace the backend HTTP stack completely. Keep Node 24, shared ts-rest
contracts, Zod schemas, controllers, database access, queues, and frontend clients.
No Express request/response adapter remains in production.

## Compatibility requirements

- Register all 93 contract endpoints with its existing method and path. Preserve
  JSON query decoding, repeated query keys, Zod transformations, defaults, and
  422 validation messages for params, query, body, and headers.
- Preserve middleware order: parse body; CORS/security/compatibility; context;
  bad-auth/root limits; stats; maintenance; authentication; endpoint limits; configuration;
  permissions; endpoint middleware; endpoint validation; controller. Return the existing JSON envelopes and custom status codes.
- Preserve Bearer, ApeKey, development Uid, public routes, fresh-token checks,
  permission checks, and configuration gates. Verify GitHub signatures against
  original body bytes, before schema transformations.
- Preserve 100 KiB body limits, JSON and URL-encoded bodies, empty-body defaults,
  proxy client addresses, IPv6 grouping, development limit multiplier,
  rate-limit headers, retry headers, and bad-auth penalties.
- Preserve compatibility-version-prefixed weak ETags, conditional GET/HEAD,
  health payload, maintenance exemption for configuration, API_PATH_OVERRIDE
  behavior for docs, development configuration assets, and simulated delay.
- Serve all four generated API documentation files with their existing MIME
  types and Redoc CSP. Replace Express-only Swagger Stats with protected Hono
  stats and Prometheus metrics; document this operational change explicitly.

## Implementation and commit sequence

1. Commit this inventory and plan before implementation.
2. Add pinned Hono/Node dependencies and a typed HTTP request/context model.
3. Build a Hono contract adapter using ts-rest core inference/validation helpers;
   register routes directly with Hono and retain controller type inference.
4. Convert authentication to Hono middleware and use original webhook bytes.
5. Convert configuration gates and permission middleware.
6. Replace Express limiters using the existing rate-limiter-flexible library.
7. Convert centralized errors, compatibility headers, parsing, and conditional
   responses; preserve logs, metrics, and custom HTTP reason phrases.
8. Convert health, maintenance, development assets/delays, and docs routes.
9. Replace Swagger Stats with Hono-native protected stats/metrics.
10. Switch app construction and Node startup to Hono.
11. Update middleware tests and the Supertest harness to use the Node Fetch
    listener; retain existing controller assertions.
12. Add request-level regression tests for validation/order, bodies, headers,
    caching, auth, limits, stats, docs, and Node server behavior.
13. Remove Express-only dependencies/types/mocks and update architecture docs.
14. Fix regressions in further focused commits, run required checks, push the
    branch, and create/link one PR containing the complete commit history.

Each coherent subsystem gets its own commit; additional fixes and regression
coverage get separate commits. Intermediate commits may depend on subsequent
migration commits; the final branch must build and pass verification.

## Verification

- Run changed middleware/controller regression files individually with
  `pnpm vitest run path/to/test.ts`; then run the backend unit suite.
- Run `pnpm oxlint --type-aware --type-check --format agent` for backend.
- Build workspace dependencies, generate API docs, and compile the backend.
- Exercise a real Node HTTP listener through Supertest, including HEAD,
  conditional requests, custom reason phrases, and raw webhook bytes.
- Attempt MongoDB/Redis integration suites when container services are available;
  report environmental blockers precisely.
- Search backend source/tests/manifests for Express imports and removed packages.
- Review final diff, dependency lockfile, commit history, and PR linkage.

## Unresolved questions

None. Preserve public contracts; explicitly describe the stats replacement.

## Implementation notes

- Contracts and frontend clients remain unchanged. Hono owns every production
  route and middleware; Express, its ts-rest adapter, Helmet, CORS, Express rate
  limits, Swagger Stats, and their direct type dependencies are removed.
- Preserve case-insensitive static path matching without lowercasing parameters;
  normalize optional trailing slashes before Hono routing.
- Forwarded address chains use the rightmost address for the existing one-proxy
  trust setting. IPv6 clients share a /56 budget. GitHub authentication uses exact
  decompressed request bytes and rejects unequal signature lengths with 401.
- The migration initially replaced Swagger Stats with an isolate-local dashboard,
  JSON summary and Prometheus metrics. These unused diagnostics and `/stats/*`
  routes were subsequently retired in favor of Cloudflare Analytics and logs.
- Documentation file tests use temporary fixtures and work without generated
  docs. The real Redoc/OpenAPI generation is verified separately by the build.

## Final verification

- Backend unit suite: `pnpm vitest run --project unit-backend` — 585 tests pass
  across 27 files. This includes 42 new HTTP/adapter/prefix regression tests.
- Backend build: `pnpm --filter @oxytype/backend run build` — passes, including
  real OpenAPI/Redoc generation and compilation.
- Typecheck: `pnpm oxlint --type-aware --type-check --format agent --tsconfig
  backend/tsconfig.json backend/src` — no errors; standalone default lint emits
  warnings. The workspace exposes Oxlint transitively through Vite+, so the local
  binary was made available for this requested command.
- Repository-configured lint/typecheck: `pnpm vp lint backend --type-aware
  --type-check --format agent` — passes.
- Formatting: `pnpm vp fmt backend --check` — passes. `git diff --check` passes.
- Dependency/import audit: no backend Express-stack imports or dependencies;
  `pnpm --filter @oxytype/backend why express @ts-rest/express express-rate-limit
  cors helmet swagger-stats` reports none.
- MongoDB/Redis integration: attempted
  `pnpm vitest run backend/__tests__/__integration__/dal/config.spec.ts`; blocked
  before tests because no working container runtime is available. Docker's
  configured socket is absent. These integration suites still need CI/runtime
  verification.
