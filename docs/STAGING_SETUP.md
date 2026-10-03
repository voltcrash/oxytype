# Staging browser setup

Worker and migration 0002 are deployed. Live API checks passed using a temporary
seeded identity, which was removed. Real GitHub login/captcha remain unverified:
staging currently has only its auth secret, and signup/result saving are disabled.

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
RECAPTCHA_SECRET=your-staging-captcha-secret
```

This ignored file is private. Preserve the existing remote `BETTER_AUTH_SECRET`;
do not copy local development vars or paste secrets into chat.

## 2. Captcha credentials

Register a separate staging **reCAPTCHA v2 checkbox** key in the
[reCAPTCHA console](https://www.google.com/recaptcha/admin/create). Add `localhost`
to its allowed domains for this frontend. The current backend uses the
[siteverify secret-key API](https://developers.google.com/recaptcha/docs/verify).
Use the matching secret in the backend file above; the public site key goes in
`frontend/.env.staging.local`:

```dotenv
BACKEND_URL=https://oxytype-api-staging.voltcrash.workers.dev/api
RECAPTCHA_SITE_KEY=your-staging-captcha-site-key
```

Development mode now honors an explicit site key; ordinary local development
retains Google's test key when none is supplied. Google's
[FAQ](https://developers.google.com/recaptcha/docs/faq) explains localhost setup
and why test keys are unsuitable for production traffic.

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

Open `http://localhost:3000`. Sign in with GitHub, choose a username, solve captcha,
complete a test, refresh, then sign out/sign in and confirm the result remains.
Verify the browser requests the staging host. Use an ordinary typing sample;
the earlier seeded API checks do not establish real-user anticheat compatibility.

If third-party cookies block the cross-site session, use a same-site HTTPS
frontend/API proxy. Return to local backend testing with `pnpm dev-fe`; staging
settings live in the separate mode file. See [operations](CLOUDFLARE_OPERATIONS.md)
and [anticheat limits](ANTICHEAT.md) before production cutover.
