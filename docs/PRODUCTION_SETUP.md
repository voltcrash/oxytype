# Production setup

Production starts fresh, as requested; no MongoDB, Redis or staging data is imported.
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
