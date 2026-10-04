# Production setup

Production starts fresh, as requested; no legacy or staging data is imported.
One Worker serves the frontend and `/api` on `https://oxytype.voltcrash.com`.
Use `backend/wrangler.production.json` explicitly. The default Wrangler config and
release CLI still target staging.

Live since 3 October 2026: Worker version `6304be50-fcb3-406c-b4f1-f7ca2b207508`,
frontend code `ec3b3919d`. Production GitHub consent and typing persistence still
require the owner browser check below.

## Resources

| Resource | Production |
| --- | --- |
| Worker/custom domain | `oxytype` / `oxytype.voltcrash.com` |
| D1 | `oxytype-production`, `43d104e9-2fef-43db-95d7-c64a08310714` |
| Queues | `oxytype-production-tasks`, `oxytype-production-dlq` |
| Turnstile | Managed **Oxytype production**, hostname `oxytype.voltcrash.com` |
| GitHub OAuth | **Oxytype**, separate from local/staging apps |

Workers.dev and preview URLs are disabled. Cloudflare manages the custom domain's
DNS record and TLS certificate through the [Workers custom-domain route](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
No KV, Durable Object, legacy database or external quote bridge is required for
the initial signup/result-history deployment.

## Private settings

Save backend credentials in ignored `backend/.dev.vars.production`:

```dotenv
BETTER_AUTH_SECRET=replace-with-a-new-private-production-secret
TURNSTILE_SECRET_KEY=replace-with-production-widget-secret
GITHUB_CLIENT_ID=replace-with-production-client-id
GITHUB_CLIENT_SECRET=replace-with-production-client-secret
```

Keep this file private (mode `0600`). Preserve the production auth secret across
redeployments; never copy staging/local secrets into it. The OAuth application's
display name does not affect authentication. Its URLs must be:

- Homepage: `https://oxytype.voltcrash.com`
- Callback: `https://oxytype.voltcrash.com/api/auth/callback/github`

Save public build settings in ignored `frontend/.env.production.local`:

```dotenv
BACKEND_URL=/api
TURNSTILE_SITE_KEY=replace-with-production-widget-site-key
AUTH_PROVIDERS=github
```

Google login stays hidden until separately configured. Enabling `google,github`
also requires production Google OAuth credentials and a matching callback.
Linked providers remain manageable in account settings. Backend secrets are not
passed into the frontend build. Examples are checked in; actual files are ignored.

## Better Auth dashboard

The backend connects to [Better Auth Infrastructure](https://better-auth.com/docs/infrastructure/plugins/dashboard)
when `BETTER_AUTH_API_KEY` is configured. Add the private project API key to
`backend/.dev.vars.production`, or save it as a separate GitHub Actions secret
named `BETTER_AUTH_API_KEY`. The daily workflow appends that secret to the private
backend file before deploying it to the Worker. Preserve the other backend
credentials; this API key does not replace `BETTER_AUTH_SECRET`.

In the dashboard's **Connect Your App** form, use:

- Base URL: `https://oxytype.voltcrash.com`
- Base Path: `/api/auth`

Deploy the integration before verifying the connection. Dashboard endpoints use
the plugin's signed authorization. Auth events use the Worker's `waitUntil` so
they can finish after the response. The client installs `dashClient()` for audit
log APIs. Activity tracking and Sentinel security policies remain opt-in; the
basic dashboard connection requires no database migration.

## First database setup — already completed for this deployment

On a **new, empty** production D1 only:

```sh
pnpm --filter @oxytype/backend db:migrate:production
pnpm --filter @oxytype/backend db:bootstrap:production
```

The atomic bootstrap refuses any existing application data. It enables signup,
public profiles, result saving and payload hash checks; automatic bans remain
disabled. Other features keep their base defaults. It creates no account or
administrator, and enables no privileged admin/statistics endpoints or quote
submission/publication. Do not rerun bootstrap during updates.

## Build and deploy updates

From the repo root, with Node/pnpm versions in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm --filter @oxytype/backend build:production-site
pnpm --filter @oxytype/backend deploy:production-dry-run
# Apply any newly added migrations before compatible code is deployed.
pnpm --filter @oxytype/backend db:migrate:production
pnpm --filter @oxytype/backend deploy:production-site
```

Builds run sequentially because shared package builds clean their output.
Deployment checks isolated bindings, required secrets, the real Turnstile key,
enabled providers and the built frontend's `/api` configuration before upload.
The deploy command uploads secrets from the private file and packages the frontend
under the Worker's public site prefix. Preserve other private values when editing.

## Daily production releases

The **Daily production release** Actions workflow runs at `00:00 UTC` each day.
It also supports **Run workflow** on `main`. It deploys the complete frontend/API
site with the production Wrangler config, applies pending production D1 migrations,
and publishes a GitHub release only after deployment succeeds.

Configure these Actions inputs in repository settings or the `production`
environment before the first run:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare token scoped to the production account, with Worker deployment, D1 migration, queue and custom-domain access. |
| Secret | `PRODUCTION_BACKEND_ENV` | Full contents of the existing private `backend/.dev.vars.production` file, preserving the deployed auth/OAuth/Turnstile credentials. |
| Secret (optional) | `BETTER_AUTH_API_KEY` | Private Better Auth dashboard project key. Overrides the same key in `PRODUCTION_BACKEND_ENV`; uploaded only to the backend Worker. |
| Variable | `PRODUCTION_FRONTEND_ENV` | Full contents of `frontend/.env.production.local`: real production site key, `BACKEND_URL=/api`, and enabled auth providers. |

The account ID and isolated resource IDs come from `backend/wrangler.production.json`.
The workflow writes credential files with mode `0600` for the validated production
commands, then removes them even on failure. It never bootstraps or resets the database.

A midnight run on October 5 creates release `2026.10.05` and tag `v2026.10.05`
at the exact deployed `main` commit. It sets the Worker `VERSION` and the build
checkout's package version to `2026.10.05`, without pushing a version commit to `main`.
“What's changed” lists all commits added since the previous successful production
release, including older branch commits merged during the day. Missed days are
included in the next successful release. The first scheduled release covers the
preceding UTC day; the first manual run covers its current UTC day. Days without
changes still deploy and publish a release with an empty-change notice.

Runs are serialized. Rerunning a completed date skips deployment and publication;
retrying a failed run keeps its original date and `main` snapshot. An older failed
run cannot deploy over a newer production release. A date tag belonging to another
commit or a conflicting manual release stops the workflow before deployment.

GitHub's scheduler can run late or drop jobs under load; midnight is the requested
trigger time, not an exact-time guarantee. See [GitHub scheduling behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
Scheduled execution starts after this workflow is merged into the default branch.
GitHub releases use the workflow's `GITHUB_TOKEN`, so they do not trigger the
separate release-event Docker workflow; dispatch that workflow on the tag when
container images are needed.

## Browser verification and monitoring

Open `https://oxytype.voltcrash.com/login` in a regular browser. Sign in with
GitHub, choose a username, complete Turnstile and a typing test. Refresh, then
sign out/sign in and confirm the result remains. The popup returns to the
standalone `/oauth-callback.html` page; frontend and API cookies share one HTTPS origin.

Monitor Workers logs, D1 size/query latency and queue backlog/DLQ. Review rejected
typing samples before enabling automatic bans; see [anticheat](ANTICHEAT.md).
Cron recovers durable jobs/outbox deliveries; see [operations](CLOUDFLARE_OPERATIONS.md).
Before future schema changes, capture a D1 backup and check code/schema rollback
compatibility. A Worker rollback retains D1 writes; never reset this database to
retry a deployment. Keep the production auth secret and credential files.
