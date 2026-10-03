# Staging browser setup

Worker and migration 0002 are deployed. GitHub credentials and a managed Turnstile
widget are configured privately. Real managed Turnstile validation passed against the deployed Worker.
The frontend and API now share `https://oxytype-api-staging.voltcrash.workers.dev`.
This avoids cross-site OAuth state/session cookies between localhost and Workers.
Signup, profiles, result saving and payload hash checks are enabled. Real-user
GitHub signup and typing must still be checked in the browser. See [Turnstile](TURNSTILE.md) for local test keys and policy.

## 1. GitHub credentials

Create an **Oxytype Staging** OAuth app in
[GitHub developer settings](https://github.com/settings/developers), following
[GitHub's registration guide](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

| Field | Value |
| --- | --- |
| Homepage URL | `https://oxytype-api-staging.voltcrash.workers.dev` |
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
Allow `oxytype-api-staging.voltcrash.workers.dev` for the hosted staging frontend.
The existing widget also permits `localhost`. When hosting elsewhere, add that
hostname and set the deployed `FRONTEND_URL` to match.
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

## 3. Build, publish and enable staging

Once all placeholders are replaced, run from the repo root:

```sh
set -a
. frontend/.env.staging.local
set +a
BACKEND_URL=/api pnpm build-fe
pnpm build-be
pnpm --filter @oxytype/backend deploy:staging-site --secrets-file .dev.vars.staging
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
`deploy:staging-site` copies the built frontend under the private `site` asset
prefix and enables frontend hosting with the HTTPS Worker origin. Public `/api/*`
requests retain API routing; unknown APIs and missing files do not become SPA HTML.
Standalone callback/legal HTML resolves before navigation fallback. HTML is not
cached. Default `deploy:worker` remains API-only and restores its configured origin.

## 4. Test the browser

Open `https://oxytype-api-staging.voltcrash.workers.dev/login` in your regular browser.
Sign in with GitHub, choose a username, complete Turnstile,
complete a test, refresh, then sign out/sign in and confirm the result remains.
Verify the browser requests the staging host. Use an ordinary typing sample;
the earlier seeded API checks do not establish real-user anticheat compatibility.

OAuth returns the popup to `/oauth-callback.html?requestId=...`. Static hosts must
serve this standalone HTML page before the main app's SPA fallback. If the popup
shows the app's 404 page, close it, fix the frontend server, refresh `/login` and retry.

Use the hosted URL for staging auth checks. Localhost calling the remote API can
lose OAuth cookies under browser privacy protections; `SameSite=None` alone does
not prevent partitioning/blocking. See [Better Auth's cookie guidance](https://better-auth.com/docs/concepts/cookies).
Return to local backend testing with `pnpm dev-be` and `pnpm dev-fe`.
See [operations](CLOUDFLARE_OPERATIONS.md)
and [anticheat limits](ANTICHEAT.md) before production cutover.
