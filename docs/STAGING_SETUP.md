# Staging browser setup

Worker and migration 0002 are deployed. GitHub credentials and a managed Turnstile
widget are configured privately. Real managed Turnstile validation passed against the deployed Worker.
Signup, profiles, result saving and payload hash checks are enabled. Real-user
GitHub signup and typing must still be checked in the browser. See [Turnstile](TURNSTILE.md) for local test keys and policy.

## 1. GitHub credentials

Create an **Oxytype Staging** OAuth app in
[GitHub developer settings](https://github.com/settings/developers), following
[GitHub's registration guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

| Field | Value |
| --- | --- |
| Homepage URL | `http://localhost:3000` |
| Callback URL | `https://oxytype-api-staging.voltcrash.workers.dev/api/auth/callback/github` |

Save its client ID and generated client secret in `backend/.dev.vars.staging`:

```dotenv
GITHUB_CLIENT_ID=your-staging-client-id
GITHUB_CLIENT_SECRET=your-staging-client-secret
TURNSTILE_SECRET_KEY=your-staging-turnstile-secret
```

This ignored file is private. Preserve the existing remote `BETTER_AUTH_SECRET`;
do not copy local development vars or paste secrets into chat.

## 2. Turnstile credentials

Create a separate **managed** staging widget in the
[Cloudflare Turnstile dashboard](https://dash.cloudflare.com/?to=/:account/turnstile).
Allow `localhost` for this staging frontend. Add your HTTPS frontend hostname when
hosting it elsewhere, and update `FRONTEND_URL` in `backend/wrangler.jsonc` to match.
The worker checks that hostname and each form's action through
[Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Use its secret in the backend file above. Save the matching public site key in
`frontend/.env.staging.local`:

```dotenv
BACKEND_URL=https://oxytype-api-staging.voltcrash.workers.dev/api
TURNSTILE_SITE_KEY=your-staging-turnstile-site-key
```

These files already exist in this worktree and contain the staging credentials.
Development mode honors an explicit site key; ordinary local development uses
Cloudflare's test widget. Test secrets are rejected by production-mode Workers.

## 3. Upload and enable staging

Once all placeholders are replaced, run from the repo root:

```sh
pnpm --filter @oxytype/backend exec wrangler deploy --secrets-file .dev.vars.staging
pnpm --filter @oxytype/backend exec wrangler secret list
pnpm --filter @oxytype/backend exec wrangler d1 execute oxytype-staging --remote \
  --command "UPDATE configuration SET data=json_set(data,
    '$.users.signUp',json('true'),
    '$.users.profiles.enabled',json('true'),
    '$.results.savingEnabled',json('true'),
    '$.results.objectHashCheckEnabled',json('true')),
    version=version+1 WHERE id='main';"
```

Secret upload is additive; it retains the existing auth secret. Keep automatic
bans disabled during initial monitoring. No local backend is needed for this test.

## 4. Test the browser

Stop the existing frontend terminal with Ctrl+C, then run:

```sh
pnpm --filter @oxytype/frontend dev --mode staging
```

Open `http://localhost:3000`. Sign in with GitHub, choose a username, complete Turnstile,
complete a test, refresh, then sign out/sign in and confirm the result remains.
Verify the browser requests the staging host. Use an ordinary typing sample;
the earlier seeded API checks do not establish real-user anticheat compatibility.

If third-party cookies block the cross-site session, use a same-site HTTPS
frontend/API proxy. Return to local backend testing with `pnpm dev-fe`; staging
settings live in the separate mode file. See [operations](CLOUDFLARE_OPERATIONS.md)
and [anticheat limits](ANTICHEAT.md) before production cutover.
