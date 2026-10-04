# Cloudflare operations

See [assessment](CLOUDFLARE_ASSESSMENT.md) and [implementation plan](CLOUDFLARE_MIGRATION.md).
Backend runtime: one Worker, D1, Queues and Cron. Node is used for builds only.
Local workerd uses local D1 without a Cloudflare login.
The [production setup](PRODUCTION_SETUP.md) uses a fresh, separate database and
`backend/wrangler.production.json`. Legacy database export/import tooling has
been retired.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm build-pkg
cp backend/.dev.vars.example backend/.dev.vars
pnpm --filter @oxytype/backend db:migrate
pnpm dev-be
# another terminal
pnpm dev-fe
```

Frontend: `http://localhost:3000`; API: `http://localhost:5005` (also `/api`).
Wrangler persists local D1 in `backend/.wrangler`; local and remote migrations
are separate commands. Result/telemetry validation runs in development and production;
never copy the development secret/test captcha key into a production deployment.
Use `.dev.vars` for Worker settings, not Node `.env`.

Google/GitHub social sign-in needs a provider's backend-only client ID/secret.
Register `BETTER_AUTH_URL/callback/google` or `/github`; local URL is
`http://localhost:5005/api/auth`. Email/password/reset flows stay disabled.
Signup, inbox and leaderboard features default disabled in BASE_CONFIGURATION;
enable deliberately through the admin configuration contract/D1, not by weakening guards.

Verification:

```sh
pnpm oxlint --type-aware --type-check --format agent backend
pnpm --filter @oxytype/backend test
pnpm --filter @oxytype/backend integration-test
pnpm --filter @oxytype/backend exec vitest run __tests__/d1/http.spec.ts
pnpm build-be
```

Build generates docs and copies quote/config assets, then performs a Wrangler
bundle dry-run. The D1 suite runs actual SQLite in workerd; unit tests preserve
controller/HTTP contracts. No container services are required.

## Staging deployment

Dedicated account: Lakshmi Tanmay, `eb2679ce4f23ae7db4e6c4e3fcf8c3c1`.
Worker: [oxytype-api-staging](https://oxytype-api-staging.voltcrash.workers.dev).
Auth URL: `https://oxytype-api-staging.voltcrash.workers.dev/api/auth`. D1: `oxytype-staging`,
`17b0ae8b-92bf-4d7e-a29e-0ac4cc6f2b59`, APAC placement hint.
Queues: `oxytype-staging-tasks` and `oxytype-staging-dlq`.
The default API-only config trusts `http://localhost:3000`; hosted staging uses
the Worker origin. Production routes are isolated in `wrangler.production.json`.

Wrangler uses `backend/wrangler.jsonc`; changing its default deploy target changes
the release CLI too. Production has a separate reviewed config/resources; use
its explicit commands. Current backend release script migrates/deploys staging;
it no longer SSHs into a Node server. Frontend delivery is separate.

```sh
pnpm --filter @oxytype/backend exec wrangler login
pnpm --filter @oxytype/backend exec wrangler whoami
pnpm build-be
pnpm --filter @oxytype/backend db:migrate:remote
pnpm --filter @oxytype/backend exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @oxytype/backend deploy:worker
```

Generate the secret privately (`openssl rand -base64 32`); preserve it across
redeployments. Set `BETTER_AUTH_URL` in Wrangler vars to the deployed URL plus
`/api/auth`, rebuild/redeploy. Do not put secrets in git. Optional secrets:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`, `TURNSTILE_SECRET_KEY`,
`INTEGRATION_SECRET`, `STATS_USERNAME`, `STATS_PASSWORD`.
Optional nonsecret vars: `INTEGRATION_URL`, `QUOTES_REPOSITORY`.

Without OAuth credentials no social login is available. Without a real Turnstile
secret production signup fails closed. [Turnstile setup](TURNSTILE.md) covers widget
hostnames, form actions, test keys and token renewal. Built-in [anticheat](ANTICHEAT.md) permits
valid production result saves and rejects inconsistent telemetry. No bypass is
supported. Staging now includes the Discord removal, signup fix and anticheat;
live API checks passed with a temporary seeded identity. GitHub and Turnstile credentials are now deployed; signup, profiles and result
saving are enabled for browser testing. Follow [staging browser setup](STAGING_SETUP.md)
for browser verification steps. Real-user GitHub signup and a human result save
have now been confirmed on hosted staging. Keep automatic
bans disabled while reviewing real typing samples. `/stats/*` remains inaccessible
without stats credentials.

Cross-site staging cookies use Secure/SameSite=None and explicit localhost
origin checks. Some browsers block third-party cookies; a same-site frontend/API
proxy is preferable for end-to-end OAuth testing.

## Discord removal

Back up D1 and pause API writes/consumers for this update. Apply
`0002_remove_discord.sql`, deploy the updated Worker, then resume traffic. It drops the
Discord column/index and OAuth-state table, removes identity/avatar fields from
user/ranking JSON, deletes Discord blocklist entries and pending bot deliveries,
and removes obsolete configuration. Accounts, sessions, rankings and rewards
are retained. Already-published bot delivery IDs acknowledge as missing rows.

The account-linking endpoints, avatar integration, rich presence and Discord
announcements are removed. Disable the old GitHub release webhook and bot
consumer; remove obsolete `DISCORD_CLIENT_ID` and `GITHUB_WEBHOOK_SECRET` bindings.
The quote approval bridge remains optional.

Migration 0002 and the updated Worker are deployed on staging. A private D1 backup
was captured under maintenance; queue delivery was paused and resumed. A Worker
rollback to code requiring the old Discord schema also needs a matching D1 restore
under maintenance; do not point that code at the migrated database.

## External bridge

`INTEGRATION_URL` must be HTTPS; bearer auth uses `INTEGRATION_SECRET`.
Every POST supplies `Idempotency-Key`; successful replies must be JSON.

- `quotes/approve`: payload from `dal/new-quotes.ts`, including the allowed
  repository and quote. Restrict repository/origin to deployment-owned Oxytype
  repos; reject upstream repositories. Commit/publish quote assets externally.
  Persist the approval ID so HTTP retries cannot append a quote twice.

Missing integrations return explicit 503 or retain queued deliveries for retry.
A bridge implementation and OAuth provider credentials are not supplied here.

## Queue/Cron recovery

Cron runs every minute: sends at most 10 outbox IDs and 10 due job IDs. Uncompleted
outbox rows are rediscovered after 15 minutes. Scheduled jobs use leases, SQL due
timestamps and at most 23 processing attempts; Queues adds retry/DLQ delivery.
Queue concurrency and batch size are one. Rewards process pages of 20, with
stable period/user mail IDs and unique D1 claims. Quote publication requires bridge
idempotency; Queues itself is not exactly once.

Every 15 minutes rebuild indexed all-time snapshots/histograms; hourly purge
expired auth records/counters, 30-day nonimportant audits and 90-day completed
outbox rows. Expired period rows remain while their payout jobs are unfinished,
including failed jobs. Important audits, results and completed scheduler IDs
have no automatic deletion policy; monitor their growth.

Inspect `scheduled_jobs` status/attempts/lease and unfinished `outbox` rows;
monitor Cloudflare queue backlog/DLQ and Workers logs. Resolve the cause before
replaying a failed job. For a reviewed job ID, reset status to `pending`, attempts
and lease to zero; Cron rediscovers it. Reward IDs still deduplicate. Replaying
outbox rows requires preserving reward identities and deduplication claims.
No automatic DLQ consumer silently discards failures.

## Database capacity and recovery

Measure DB+indexes against the account tier and projected growth; benchmark
result saves, exact rate counters, ranking reads/rebuilds and bcrypt CPU. Large
history may need external SQL, partitioning or R2 archival.

Production starts with a fresh D1 database. For existing D1 deployments, back up
the database and pause writes/consumers before schema changes. A code rollback
that requires an older schema also requires a matching database restore.
