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
- D1 is authoritative for application/auth data, rankings, expiring OAuth state,
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
- George/Discord tasks need an HTTP bridge or a native HTTP integration; the
  existing bot consumer is not in this repository. Delivery must be retryable.
- Keep Mongo/Redis clients only in offline import tooling while needed. Never
  include them, native bcrypt, file logging, or subprocesses in the Worker.
- Default deployment target: a new staging Worker. Existing production routing
  and databases remain untouched unless the user specifies a production cutover.

## Compatibility requirements

1. Preserve all contract endpoints, envelopes, validation messages, ownership
   checks, feature gates, compatibility headers, conditional GET/HEAD, and custom
   status codes. Preserve compressed JSON/form limits and exact webhook bytes.
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
   work; external unlink deliveries use an outbox. Preserve ban blocklisting.
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
  reward/mail state, OAuth state, job ledger, rate counters, and outbox.
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
- Port Discord/George integration to a configured HTTP bridge with idempotency
  keys and explicit missing-integration errors. Port quote approval to external
  HTTP automation; preserve allowed repository/origin policy.
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
- Exercise HTTP health/config/docs/auth guards, body limits, webhook verification,
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
- [ ] Worker foundation and local tooling.
- [ ] Schema/migrations and identifiers.
- [ ] DAL/configuration.
- [ ] Auth/middleware.
- [ ] Results/progression/inbox.
- [ ] SQL rankings.
- [ ] Queues/Cron/integrations.
- [ ] Import/operations/cleanup.
- [ ] Full verification, Wrangler deployment, single linked PR.

## Pending deployment inputs

- Cloudflare account/Worker target and authenticated Wrangler access.
- Existing data import versus empty staging database; export/source access if
  import is requested. Implementation includes preserving import tooling either way.
- OAuth secrets, existing auth secret if preserving sessions, and integration
  bridge credentials/callback URLs. These are runtime inputs, not git contents.
