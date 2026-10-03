# Cloudflare backend migration

## Objective

Replace the production Node/MongoDB/Redis/BullMQ backend with one Hono Worker,
D1 and Drizzle, Better Auth on D1, Cloudflare Queues, and Cron Triggers. Preserve
the shared contracts, Solid frontend, social login, application IDs, result
history, ranking rules, moderation, and account ownership checks.

One PR; separate commits for each coherent part. This document tracks decisions,
verification, deployment, and any external blockers throughout implementation.

## Scope and boundaries

- Worker exports `fetch`, `queue`, and `scheduled`; no permanent server process.
- D1 is authoritative for application/auth data, rankings,
  rate-limit counters, job scheduling, reward claims, and delivery outbox.
- Drizzle owns schema/types/migrations. Use prepared SQL for atomic batches and
  SQL features where the ORM cannot express the required D1 behavior.
- JSON is acceptable for bounded settings and compatibility payloads. Query,
  identity, ownership, counters, ranking, and expiry fields get real columns and
  indexes. Independently claimed rewards and job identity get separate rows.
- KV is optional for disposable public/config caches. Never use it for auth,
  OAuth consumption, ranking updates, counters, or reward correctness.
- No Durable Objects initially. Atomic SQL/conditional updates handle current
  coordination. Introduce DOs only if measured traffic makes exact per-actor
  quota coordination impractical in D1 or a realtime feature is added.
- Quote repository edits become an authenticated HTTP integration with external
  GitHub/CI automation. Workers cannot run local git. Preserve submission and
  moderation behavior; clearly report unavailable external integrations.
- Discord integration is removed: linking/avatar UI and APIs, bot tasks, release
  webhooks and rich presence. Migration 0002 cleans legacy data and deliveries.
  Quote publishing continues through the optional HTTP bridge.
- Keep Mongo/Redis clients only in offline import tooling while needed. Never
  include them, native bcrypt, file logging, or subprocesses in the Worker.
- Default deployment target: a new staging Worker. Existing production routing
  and databases remain untouched unless the user specifies a production cutover.

## Compatibility requirements

1. Preserve all contract endpoints, envelopes, validation messages, ownership
   checks, feature gates, compatibility headers, conditional GET/HEAD, and custom
   status codes. Preserve compressed JSON/form limits.
2. Preserve `/api` public routing and `/auth` handling; Google/GitHub callbacks,
   cookies, account linking, bearer tokens, fresh sessions, disabled accounts,
   and immediate revocation. Keep the existing secret when importing sessions.
3. Preserve 24-character application ObjectId strings and authentication UUIDs.
   No automatic re-keying of existing users, results, tags, presets, or API keys.
4. Convert legacy result fields during import and on compatible reads. Preserve
   missing/default values, premium lifetime `-1`, BSON dates/Longs, and activity.
5. Preserve PB matching dimensions; daily rounded kogascore and top-N behavior;
   weekly cumulative XP/time; global/friend rank distinction; all-time eligibility
   and ordering. Generation-based snapshots avoid half-built leaderboards.
6. Critical result writes complete before success. Use idempotency and optimistic
   guards to prevent duplicate XP, lost PBs/streaks, and stale JSON overwrites.
7. Rewards and inbox read/delete claims are atomic and exactly-once in D1 even
   when Queues delivers a job more than once. Badge inventory remains unique.
8. Account deletion/reset removes owned rows, auth sessions, rankings, and pending
   work. Preserve ban blocklisting for names and email addresses.
9. Existing arbitrary rate-limit windows and bad-auth penalties persist. Workers
   Rate Limiting bindings may supplement these but cannot replace their semantics.

## Detailed phases and commit sequence

### Part 0 — plan and prerequisites

- Commit this document before implementation.
- Inspect branch/PR state, available dependency versions, tools, and Wrangler
  authentication without exposing secrets.
- Confirm deployment account/target and whether existing data needs importing.
- Keep one GitHub PR for this branch; link it to the T3 thread when created.

### Part 1 — Worker/D1 foundation

- Add pinned Wrangler, Drizzle, compatible auth adapter and legacy bcrypt verifier.
- Add typed Worker environment, request-scoped services, modern Worker bundling,
  Wrangler staging configuration, D1 binding and static documentation assets.
- Remove filesystem/process side effects from modules reached at Worker startup;
  preserve the existing backend temporarily until subsequent adapters land.
- Verify Worker bundle dry-run and startup health without Mongo/Redis.

### Part 2 — schema, migrations, and identifiers

- Add generated Better Auth tables including disabled users and database limits.
- Add application users/results/config/presets/keys/connections/quotes/reports,
  blocklist/admin/PSA/public tables with owner/time/pair/expiry indexes.
- Add personal/leaderboard bests, period entries, snapshot generations, activity,
  reward/mail state, job ledger, rate counters, and outbox.
- Add identifier/legacy serialization helpers and D1 transactional batch helpers.
- Apply migrations locally; check uniqueness/FKs/indexes and rollback on failure.

### Part 3 — basic DAL and configuration

- Port configs/presets/API keys/connections/admin/blocklist/PSAs/public/quotes/
  reports/logs to Drizzle/D1. Replace direct collection callers with DAL methods.
- Port live configuration to D1; remove boot-time file writes and stale global
  authority. Retain defaults, patch semantics, and development configuration UI.
- Port user profile/settings/collections with ownership and concurrent-update
  guards. Keep API serialization stable.
- Verify targeted DAL behavior against local D1, including concurrent limits,
  duplicate connections, normalized names, and configuration patch preservation.

### Part 4 — Better Auth and request middleware

- Replace Mongo auth adapter with SQLite Drizzle adapter (`transaction:false`);
  map custom models explicitly; inject D1/auth from bindings per request.
- Port disabled-user/email hooks and registration cancellation/deletion.
- Replace native bcrypt for legacy ApeKeys; use versioned SHA-256 hashes for new
  random keys and opportunistically upgrade verified legacy keys.
- Port exact rate-limit windows/penalties to atomic D1 counters; trust Cloudflare
  IP metadata and preserve IPv6 grouping/headers.
- Verify social callback/session/revocation/CSRF/freshness and API-key regressions.

### Part 5 — results, user progression, and inbox

- Port result CRUD, tag relationships, personal/tag PBs, XP/counters/activity,
  streaks, badges, favorites, and moderation history.
- Add a result submission unit of work with atomic database changes, idempotency,
  optimistic user-version guards, and durable outbox records.
- Make inbox rewards/claims unique and atomic across read/delete retries.
- Port deletion/reset and developer-generated data away from raw collections.
- Verify duplicate/concurrent submissions, PB improvement, streak/day boundaries,
  reward retries, and account deletion using real SQL behavior.

### Part 6 — SQL rankings

- Replace Redis daily/weekly services and Lua with conditional SQL UPSERTs,
  atomic increments, top-N pruning, deterministic ordering, friend joins, and
  scheduled expiry. Preserve response behavior for non-improving daily results.
- Replace Mongo all-time aggregation with indexed leaderboard bests and ranked
  snapshots; build a generation before atomically publishing it.
- Replace histogram aggregation with SQL buckets; preserve global/friend ranks.
- Verify ties, pruning, purge/ban/opt-out, period boundaries, snapshot publication,
  incremental XP/time, and eligibility with existing fixture expectations.

### Part 7 — durable background work and integrations

- Replace BullMQ wrappers with typed messages and D1 outbox/job ledger.
- Cron discovers due daily/weekly periods and dispatches jobs; never depend on
  multi-day Queue delays or isolate-local scheduling caches.
- Queue consumer claims jobs, commits unique reward mail/grants, acknowledges
  completed messages, retries failures with backoff, and uses a DLQ.
- Port quote approval to external HTTP automation with idempotency keys, explicit
  missing-integration errors and allowed repository/origin policy.
- Add expiry/retention/outbox recovery and snapshot maintenance schedules.
- Verify duplicate delivery, failures between commit/send/ack, delayed catch-up,
  disabled features, malformed messages, and external integration failures.

### Part 8 — offline import, operations, and cleanup

- Add offline Mongo Extended JSON + Redis export/import tools, resumable
  checkpoints, deterministic IDs, dry-run validation, counts/relationship checks,
  and import manifests. Do not connect to production without supplied access.
- Preserve active period boards; translate/drain delayed jobs before cutover.
- Move logs/metrics to Worker observability; retain bounded useful audit data.
- Update development commands, release deployment scripts, CI, environment
  examples, hosting docs, Docker guidance, and migration/cutover instructions.
- Remove Mongo/Redis/BullMQ/cron/Node listener from production dependencies.
- Verify no prohibited runtime imports in the final Worker dependency graph.

### Part 9 — release verification and Wrangler deployment

- Run affected tests individually, then all required suites; use workerd/local
  D1 rather than only mocked SQL. Check existing frontend/contracts behavior.
- Typecheck/lint with `pnpm oxlint --type-aware --type-check --format agent`;
  format and check diff; build packages/docs/Worker; run Wrangler dry-run.
- Exercise HTTP health/config/docs/auth guards, body limits, retired endpoint checks,
  result/account workflows, queue retries, scheduled recovery, and local migrations.
- Create staging D1/Queues/DLQ via Wrangler; configure actual account bindings,
  secrets and public URLs; apply migrations; deploy via Wrangler.
- Smoke-test deployed health and safe public endpoints. OAuth providers require
  actual credentials/callback registration; record any unavailable validation.
- Push only to GitHub (origin also has GitLab/Codeberg push URLs). Create/update
  one PR with all commits, validation and deployment evidence; link/check it.
- Production cutover, when requested: freeze writes, disable old cron/consumers,
  import final delta, verify counts, switch routing, monitor. Retain backups and
  reverse-replay strategy; never treat routing rollback as data rollback.

## Capacity and release gates

- Measure database plus indexes and projected growth against D1's 10 GB ceiling.
  Result retrieval limits do not delete history. No implicit retention changes.
- Respect 100 bound parameters/statement, 2 MB rows and 30-second query limits.
  Chunk imports, batch queries and avoid full scans on request paths.
- Atomic D1 batches are supported; interactive transactions are not. Conditional
  zero-row writes must be detected explicitly; all dependent changes share guards.
- Keep revocation/claims/state on primary-consistent reads. Replicas/public caches
  are an optional later optimization with explicit consistency handling.
- If history/throughput exceeds D1, retain queryable history in external SQL or
  design partitioning and R2 archives before production cutover.
- Secrets and exports never enter git. No existing databases or routes deleted.
- Final deployment must not silently enable signup, reward processing, external
  integrations, or anticheat bypass beyond the configured staging behavior.

## Progress

- [x] Repository assessment and plan.
- [x] Worker foundation and local tooling.
- [x] Schema/migrations and identifiers.
- [x] DAL/configuration.
- [x] Auth/middleware.
- [x] Results/progression/inbox.
- [x] SQL rankings.
- [x] Queues/Cron/integrations.
- [x] Import/operations/cleanup.
- [x] Full verification, Wrangler deployment, single linked PR.

## Pending deployment inputs

- Confirmed: new staging Worker with empty D1. Existing deployments remain untouched.
- Confirmed account: Lakshmi Tanmay (`eb2679ce4f23ae7db4e6c4e3fcf8c3c1`); Wrangler authenticated.
- Confirmed trusted frontend: `http://localhost:3000`.
- Preserving import tooling remains in scope for a later data migration.
- OAuth secrets, existing auth secret if preserving sessions, and integration
  bridge credentials/callback URLs. These are runtime inputs, not git contents.

## Verification before staging deployment

- 591 backend controller/HTTP/unit checks; 30 workerd-backed D1 checks.
- Shared contract test and 27 schema checks; workspace type-aware Oxlint clean.
- Wrangler bundle: 622.31 KiB gzip; 97 static assets; local migrations applied.
- Local Wrangler: `/api`, configuration, docs, unauthenticated session, 401 user
  guard and manually invoked Cron pass. Preserving importer CLI fixture validated
  checksums, canonical BSON, ordered SQL, row counts and foreign keys in local D1.
- Assessment: [CLOUDFLARE_ASSESSMENT.md](CLOUDFLARE_ASSESSMENT.md).
  Runbook: [CLOUDFLARE_OPERATIONS.md](CLOUDFLARE_OPERATIONS.md).
- At this initial deployment, production result saves were blocked by the absent
  anticheat module. The follow-up below implements baseline validation.
  OAuth/captcha/bridge credentials remain deployment inputs. No bypass enabled.

## Staging deployment record — 3 October 2026

- URL: https://oxytype-api-staging.voltcrash.workers.dev
- Auth base: https://oxytype-api-staging.voltcrash.workers.dev/api/auth
- Wrangler applied both migrations and deployed fetch/queue/Cron to the confirmed
  account. Generated auth secret stored through Wrangler; no secrets committed.
- Verified live health/config/docs, HEAD/ETag 304, localhost CORS, null anonymous
  session, 401 user/stats guards, disabled email login, untrusted-origin 403 and
  raw/gzip expanded body limits. Workerd zlib emits an uncoded RangeError on
  capped output; mapped to the existing 413 contract.
- D1 contains zero users/results/auth users; one default config and two generated
  board records. Foreign-key check clean. Remote Cron generated board metadata;
  queue info confirms this Worker is producer and consumer.
- Frontend: 1,340 tests passed. UUID result/admin compatibility and a full hashed
  result save under forced CAS retry verified; progression commits once.
- PR: https://github.com/voltcrash/oxytype/pull/24. Production cutover remains a
  separate operation after data/integration checks and anticheat rollout review.

Initial deployed Worker version: `a70e71d5-4646-4b80-8ae1-bcc8db813ef6`.
Verified capped gzip/deflate → 413, small gzip → authentication guard, malformed
compression → 400, and request-initialized uptime. Final backend unit rerun:
591/591 passed. All implementation commits are pushed; PR marked ready for review.


### Discord removal follow-up

Removed Discord account linking, avatars, rich presence, bot roles, release and
leaderboard announcements, and the release webhook. Migration 0002 removes
legacy stored metadata and deliveries; offline imports discard obsolete bot
jobs and identities. Quote approval retains its optional publishing bridge.

Validation: 599 backend/D1 tests passed across the full run and a standalone
rerun of one three-test suite whose setup timed out under concurrent load;
1,341 frontend tests and 28 shared schema/contract tests passed. Type-aware
Oxlint, formatting, changed-theme Stylelint, shared-package builds, API docs,
Worker dry-run and frontend production build with the repository's captcha test
key passed. This follow-up is committed separately for frontend, backend/data
and documentation. Deploy after the migration procedure in the runbook.

### Signup and anticheat follow-ups

Fresh social sessions survive the missing-profile response until username setup.
Local signup, result save, refresh and sign-out/sign-in persistence were verified
in the browser. Built-in [anticheat](ANTICHEAT.md) now validates scores, duration,
chart/key telemetry and a narrow fixed-timing bot signature in all runtime modes.
First saves use server account time; database read failures fail closed. Rejection
audits and configured strikes persist atomically without result/progression writes.

Validation: 95 targeted backend/D1/browser-compatibility checks, workspace
type-aware Oxlint and Worker build/dry-run passed. Staging deployment is recorded
below. OAuth/captcha and production-mode browser checks remain before cutover.
Automatic bans remain disabled by default.

### Staging update — 3 October 2026, 09:35 UTC

- Updated Worker version: `3e08d571-58e1-4c29-8656-d2bd6190d497`, backend commit
  `96cf43287`; production mode, unchanged staging URL/account/D1/auth secret.
- Paused queue delivery and deployed temporary maintenance (HTTP 503, no Cron
  writes). Exported D1 privately with file mode 0600, SHA-256
  `0fa8d3f146283c80628ce558c1d81dbca325832bd40e2ccaffcce72cbd50723a`.
- Applied migration 0002, deployed the Worker and resumed queue delivery. All
  migrations applied; Discord table/index/column absent; foreign keys clean.
- 25 live HTTP checks passed: health/config/CORS/docs/ETag and auth guards;
  seeded session survives onboarding 404; valid result saves and persists;
  forged score, key timeline, short sentinels, fixed bot, missing high-speed data
  and too-early second save reject with expected statuses. Rejections grant no
  progress; successful save grants one result and 30 seconds typing time.
- Removed temporary identity/session/result/audit/rate-counter data and fixture
  public counters. D1 again contains zero users/auth users/sessions/results;
  signup, result saving and hash configuration restored to their initial values.
- Only the original auth secret exists remotely. Real GitHub/captcha browser
  verification remains pending; [setup steps](STAGING_SETUP.md) and private ignored
  credential templates are prepared. Development frontend now honors an explicit
  captcha site key; four generated-config assertions and workspace typecheck pass.

### Turnstile staging update — 3 October 2026

- All four captcha flows now use Cloudflare Turnstile; provider scripts,
  validation, environment names, Docker placeholders and CI keys are replaced.
  Request bodies retain `captcha`; no D1 migration was needed.
- Siteverify matches the frontend hostname and each form action, rejects all
  official test secrets in production, and fails closed on bad/spent tokens or
  unavailable verification. Widgets clear expired tokens, reset after requests
  and clean up when modals close. Signup retains its session for challenge retries.
- Provisioned managed widget **Oxytype staging**, allowing `localhost`. Its secret
  and the supplied GitHub credentials are stored only in ignored private files and
  deployed secrets; the existing auth secret was preserved.
- Deployed Worker version `51fe6edc-1824-493d-9bdd-1b00c6678472` with code through
  `0b6eb5ef5`. Enabled signup, profiles, result saving and payload hash checks;
  automatic bans remain disabled.
- 187 targeted tests passed: 17 Siteverify/security, 113 user-controller,
  44 quote-controller, two D1/auth and 11 Solid widget/form tests. Workspace
  type-aware Oxlint, commit hooks, Worker dry-run/API docs and frontend production
  build passed. No active legacy captcha references remain.
- Real managed challenge passed in the browser. Live Worker rejected a dummy token
  with HTTP 422, preserved its D1-backed onboarding session (200), accepted the
  real token for signup (200), and returned the saved profile (200). Synthetic
  identity/session/profile/audit/rate data were removed; D1 again has zero users,
  sessions and results, with clean foreign keys.
- Health/config endpoints returned 200. GitHub sign-in returned 200 and the required
  `/api/auth/callback/github` URL on the staging host. Actual GitHub consent/code
  exchange and a human typing save against staging remain to be checked in an
  ordinary browser. [Staging setup](STAGING_SETUP.md) and [Turnstile policy](TURNSTILE.md)
  describe configuration and the remaining browser steps.

### OAuth popup routing fix — 3 October 2026

The temporary static preview server sent `/oauth-callback` to the main app's SPA
fallback, showing 404 after GitHub authorization. Sign-in and account linking now
request the built `/oauth-callback.html` entry explicitly. Vite preview replaced
the temporary server; both callback paths return the standalone entry, and browser
hydration was verified. All 13 OAuth runtime/callback tests, type-aware lint and the
staging-configured frontend production build passed. Real-user staging signup and
typing verification remain pending.
