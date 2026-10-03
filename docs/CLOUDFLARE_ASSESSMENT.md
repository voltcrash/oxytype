# Cloudflare migration assessment

Baseline inspected: `845334802`. Implementation and staging rollout are in one
PR; [the plan](CLOUDFLARE_MIGRATION.md) tracks phases. Recommendation: one Hono
Worker + D1/Drizzle + Better Auth + Queues/Cron initially. No KV or application
Durable Objects required. Production suitability depends on measured database
size, write throughput and completion of external integrations.

## 1. Mongo models and access points

The baseline uses typed Mongo collections, not Mongoose. Schemas come from
`packages/schemas` plus `DBUser`, `DBResult`, `DBConfig`, `DBConfigPreset` and
collection-local types. ObjectIds identify application records; Better Auth IDs
are strings. Dates and activity counters include BSON Date/Long values.

| Collection / owning module under `backend/src` | Stored shape / behavior |
| --- | --- |
| `users` — `dal/user.ts` | uid, name/email/Discord, counters, PBs, streak, activity, tags, themes, inventory, inbox, favorites, quote ratings, moderation/history |
| `results` — `dal/result.ts` | owner, timestamp, test dimensions, speed/accuracy, chart/telemetry payload, tags; legacy result conversions |
| `configs`, `presets` — matching DALs | user settings JSON; named presets and setting groups |
| `ape-keys` — `dal/ape-keys.ts` | owner, bcrypt hash, enablement, creation/use timestamps, counters |
| `connections` — `dal/connections.ts` | initiator/receiver IDs/names, pending/accepted/blocked status, modification time |
| `leaderboards.<language>.<mode>.<mode2>` — `dal/leaderboards.ts` | materialized rank/profile/result snapshots; user aggregation and friend joins |
| `blocklist`, `admin-uids` — matching DALs | hashed banned identities; authorized admin UIDs |
| `configuration` — `init/configuration.ts` | live application feature flags and limits merged with defaults |
| `psa`, `public` — matching DALs | announcements; aggregate typing counters and speed histograms |
| `new-quotes`, `quote-rating` — matching DALs | moderation submissions; aggregate quote rating/count |
| `reports`, `logs` — matching DALs | reporter/content identity; audit event, timestamp, importance, payload |
| `errors` — `middlewares/error.ts` | error ID, stack, endpoint/request metadata |
| `authUsers`, `authAccounts`, `authSessions`, `authVerifications`, `authRateLimits` — `init/auth.ts` | Better Auth identities/providers/tokens, expiring sessions and verification state, auth quotas |

All baseline database entry points: `init/db.ts`; the 15 DALs listed above;
`init/auth.ts` (adapter, disabled-user hook and indexes); `init/configuration.ts`;
`middlewares/error.ts`; `jobs/delete-old-logs.ts`; `jobs/log-collection-sizes.ts`.
`server.ts` opens/closes connections and initializes indexes. Controllers use
DALs; `controllers/{ape-key,dev,quote,user}.ts` and `utils/{misc,result}.ts` also
construct/serialize ObjectIds. Auth utilities call the Better Auth adapter.
Offline `__migration__/testActivity.ts` and the old integration fixtures also use
Mongo. These have been replaced or removed from runtime/test infrastructure.

## 2. Redis/BullMQ mapping

| Baseline use | Cloudflare replacement |
| --- | --- |
| Daily sorted sets + result hashes + five Lua scripts | D1 `daily_entries`, conditional best-score UPSERT, top-N pruning, indexed score/UID ordering; same kogascore and reverse lexical ties |
| Weekly XP sorted sets + hashes | D1 `weekly_entries`; atomic XP/time increments, indexed ranks and expiry |
| Discord `SETEX`/`GETDEL` state | D1 `oauth_states`; expiring atomic DELETE RETURNING; never KV |
| BullMQ `later`: daily payouts, seven-day weekly payouts | D1 `scheduled_jobs`; Cron dispatches due IDs to Queues, leased processing and durable page continuations |
| BullMQ `george-tasks`: Discord roles/link/unlink/ban, release/leaderboard announcements | D1 outbox + Queues; authenticated external HTTPS bridge with idempotency keys |
| Queue counts, retries, duplicate job IDs | D1 job/outbox ledger; Queues retries + DLQ; unique business reward grants |
| Rate limits | Baseline used **process memory**, not Redis. Atomic D1 windows retain semantics across isolates; measure write load |
| Config/quote/isolate caches | Invocation-local config and static assets initially; optional KV for disposable cached public responses |

Queues delivers at least once; job IDs and reward claims must deduplicate in D1.
Seven-day delays stay in the SQL scheduler.
[Delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/),
[Queue delays](https://developers.cloudflare.com/queues/configuration/batching-retries/).

## 3. Runtime incompatibilities

Remove Node HTTP listener, boot/shutdown lifecycle, permanent Bull workers,
process Cron, Mongo/Redis sockets and Lua loading. Replace native bcrypt with
`bcryptjs` for legacy random ApeKeys and SHA-256 for new high-entropy keys.
Replace filesystem quote/config/docs access with Worker assets/D1. Local git
(`simple-git`) and repository writes remain external. Replace Winston file
transports with structured console logs and Workers observability.

Bindings/config/auth are invocation scoped via AsyncLocalStorage; no import-time
`process.exit` or production environment decisions. Crypto, Buffer, AsyncLocalStorage
and compatible `prom-client` still bundle; metrics are per isolate, not fleet
aggregates. Node compatibility defaults on for the selected 2026-10-02 date;
this does not make native modules or a persistent process available.
[Cloudflare runtime change](https://developers.cloudflare.com/changelog/post/2026-08-04-nodejs-compat-default/).

## 4. SQL mapping and indexes

Implemented source: `backend/src/db/schema.ts`; migrations `0000` + `0001`.

| D1 tables | Keys/indexes and mapping |
| --- | --- |
| Five `auth_*` tables | string PKs; unique user email/session token/provider+account; user and expiry indexes; Date → integer milliseconds |
| `users` | uid PK, original application id unique, normalized name unique, Discord unique; scalar counters/eligibility/version + compatibility JSON |
| `results` | original id PK; owner/time/id and owner/mode/duration/language indexes; unique owner/submission hash for new writes; payload JSON |
| `configs`, `presets`, `ape_keys` | owner FKs; owner/time or owner indexes; settings JSON, explicit key hash/use columns |
| `connections` | unique canonical unordered pair; participant/status indexes; explicit FK participants/status CHECK |
| `leaderboard_bests`, `leaderboard_generations`, `leaderboard_snapshots` | board+uid PK; board/score index; generation+board+uid PK and unique generation+board+rank; atomic snapshot publication |
| `daily_entries`, `weekly_entries` | board/period/uid or period/uid PK; rank, expiry and owner indexes |
| `user_activity`, `inbox`, `reward_grants` | uid/day, uid/mail PKs; unique reward origin+uid; read/deleted/claimed flags; owner indexes |
| `configuration`, `psas`, `public_stats`, `speed_histograms` | singleton IDs or board/bucket PK; atomic counters and bounded JSON |
| `quote_submissions`, `quote_ratings`, `user_quote_ratings`, `reports` | review status/language/time; language/quote and owner/quote PKs; report ID and reporter/content uniqueness; user rating compatibility JSON retained |
| `blocklist`, `admin_uids`, `audit_logs` | kind/hash or uid PK; audit owner/time and importance/time indexes; old errors mapped to audit events |
| `oauth_states`, `rate_counters`, `scheduled_jobs`, `outbox`, `mutation_guards` | expiry/due/lease/pending indexes; unique job IDs; optimistic version CHECK guard |

Owned rows cascade on account deletion. Application and authentication users
remain separate: social auth may precede username registration. IDs stay strings;
BSON Long values must fit safe integers. Legacy unbounded arrays remain a
capacity gate; inbox/activity/ranking/reward authority is normalized. Importer
preserves PB/config/history JSON and lifetime premium values, derives rankings
from stored leaderboard PBs where present, and validates identity/FK conflicts.

Critical result writes, counters, progression, period entries and outbox records
share a guarded atomic D1 batch. CAS retries prevent stale JSON overwrites.
Better Auth uses the Drizzle SQLite adapter with interactive transactions off.

## 5. Changes by module

- `worker.ts`, `runtime/{env,tasks}.ts`, `app.ts`: fetch/queue/scheduled entry,
  bindings, `/api` routing, asset delivery, Cron recovery and retention.
- `db/{schema,client,mutation,ranking}.ts`, `migrations/`, `drizzle.config.ts`:
  schema, prepared SQL, guarded units of work and ranking queries.
- `dal/*`, `init/configuration.ts`, `services/user-deletion.ts`: all storage,
  ownership, counters, settings and account/reset operations ported to D1.
- `init/auth.ts`, `auth/routes.ts`, `utils/{auth,ape-key,discord}.ts`,
  `middlewares/rate-limit.ts`: D1 auth/revocation/state/quotas and key hashing.
- `controllers/{result,user,dev}.ts`, `jobs/update-leaderboards.ts`,
  `utils/daily-leaderboards.ts`, `services/weekly-xp-leaderboard.ts`: atomic
  progression and SQL daily/weekly/all-time ranking parity.
- `queues/*`, `workers/later-worker.ts`, `utils/integration.ts`,
  `dal/new-quotes.ts`: durable delivery, paginated rewards and external bridge.
- `scripts/*import*`, `scripts/{export-mongo,export-redis,mongo-mapping,redis-mapping,local-d1}.ts`:
  offline export, integrity checks, SQL generation and real D1 preflight.
- `wrangler.jsonc`, `.dev.vars.example`, package/release/CI/Docker/docs:
  Wrangler development/build/deploy; Mongo/Redis clients confined to offline tools.
- `__tests__/d1/*`: workerd-backed SQL regressions; existing HTTP/controller
  suites retained with a D1 transport harness. Shared mail schema accepts old
  token/UUID IDs and new 24-character reward IDs.

## 6. Limits and external dependencies

D1: 500 MB Free / 10 GB Paid per DB, 2 MB row, 100 KB SQL, 100 bound parameters,
50 Free / 1000 Paid queries per invocation, 30-second query/batch duration.
A DB processes queries serially. Measure result-history growth, indexes,
user JSON size, leaderboard rebuilds and exact-quota writes before cutover.
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
Free Worker CPU is 10 ms per invocation; legacy bcrypt verification/large payloads
need measurement and likely Paid for production.
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

Keep quote git automation/Discord bot integration external until a tested bridge
exists. The anticheat module is absent in this checkout: production-mode
result submissions, including staging, remain rejected; no bypass is enabled. Social OAuth and
captcha need deployment-owned credentials. Browser third-party cookie blocking
can affect localhost → staging login; use a same-site proxy for full testing.

No production dataset supplied: import fixture tests do not establish real-data
compatibility/capacity. Export under a write freeze; resolve unknown collections,
orphans, case-folded names, huge rows and partially processed jobs explicitly.
If history exceeds D1 capacity/throughput, keep history in external SQL or design
partitioning plus R2 archival before cutover. Important audits/history have no
implicit deletion policy. Outbox integrations require remote idempotency.

## 7. Phased rollout / 8. Worker count

Plan → Worker/schema → basic DAL → auth → atomic results/inbox → SQL rankings →
Queues/Cron → offline import/ops → verified empty staging deployment. Each part
has a separate commit in the same PR. Rehearse data migration separately; then
freeze old writes/cron/consumers, export and preflight, import into a fresh D1,
reconcile counts/samples/rewards, configure integrations, switch routing and
monitor. A route rollback alone does not reverse new D1 writes.

**One Worker is sufficient initially**: HTTP, queue and scheduled handlers share
bindings and code, with queue concurrency one and pages of 20 rewards. Split the
consumer later for measured CPU/deployment isolation; it does not remove a
single D1 write bottleneck. No current feature requires application Durable Objects.
