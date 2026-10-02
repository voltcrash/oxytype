# Oxytype Self Hosting

<!-- TOC ignore:true -->

## Table of contents

<!-- TOC -->

- [Oxytype Self Hosting](#oxytype-self-hosting)
  - [Table of contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Quickstart](#quickstart)
    - [Hosting over the network (HTTPS)](#hosting-over-the-network-https)
  - [Upgrading database containers](#upgrading-database-containers)
  - [Security](#security)
  - [Account System](#account-system)
    - [Setup Better Auth](#setup-better-auth)
    - [Update backend configuration](#update-backend-configuration)
    - [Setup Recaptcha](#setup-recaptcha)
    - [Setup email optional](#setup-email-optional)
  - [Enable daily leaderboards](#enable-daily-leaderboards)
  - [Configuration files](#configuration-files)
    - [env file](#env-file)
    - [backend-configuration.json](#backend-configurationjson)

<!-- /TOC -->

## Prerequisites

- you need to have `docker` and `docker-compose-plugin` installed. Follow the [docker documentation](https://docs.docker.com/compose/install/) on how to do this.

## Quickstart

- create a new directory (e.g. `oxytype`) and navigate into it.
- download the [docker-compose.yml](https://github.com/voltcrash/oxytype/tree/master/docker/docker-compose.yml) file.
- create an `.env` file, you can copy the content from the [example.env](https://github.com/voltcrash/oxytype/tree/master/docker/example.env).
- download the [backend-configuration.json](https://github.com/voltcrash/oxytype/tree/master/docker/backend-configuration.json)
- generate a secret with `openssl rand -base64 32`; set `BETTER_AUTH_SECRET` in `.env`.
- run `docker compose up -d`
- after the command exits successfully you can access [http://localhost](http://localhost)

### Hosting over the network (HTTPS)

If you plan to access your self-hosted Oxytype instance over a local network or the internet (not using `localhost`), **you must serve it over HTTPS**. Modern browsers restrict key web features, such as `crypto.randomUUID`, to secure contexts. Accessing the site via HTTP over a network will cause the frontend to crash with errors like `Uncaught TypeError: crypto.randomUUID is not a function`.

#### Enable HTTPS

Update the `.env` file and uncomment these lines and set the values based on your domain.

```
DOMAIN=mydomain.com
BASE_URL=https://mydomain.com
ACME_EMAIL=certmanager@mydomain.com
```

Update the `docker-compose.yml` and uncomment all lines marked with `# enable for HTTPS`.



#### Troubleshooting Frontend Connection Issues

If your reverse proxy is up but you see errors like `Looks like the server is experiencing unexpected down time` or network errors when fetching resources, your frontend is likely trying to communicate with the backend over unsecure HTTP, causing a **Mixed Content** block in the browser.

Ensure you configure the frontend to talk to your secure backend URL by following these rules in your `.env` file:

1. **Update the frontend and backend URL:** Set `DOMAIN` and `BASE_URL` correctly, usually `BASE_URL` is `https://DOMAIN`.
2. **Do not include a trailing slash:** Ensure the URL does not end with a `/` (e.g., use `https://yourdomain.com`, **not** `https://yourdomain.com/`). A trailing slash will cause `404 Not Found` errors due to double slashes in the API calls (like `//configuration`).
3. **Force container recreation:** Oxytype is a Single Page Application (SPA), meaning environment variables are baked into the static JavaScript files during startup. If you change your `.env`, you must completely recreate the container for the changes to apply:

```bash
docker compose up -d --force-recreate
```

> [!TIP]
>     After updating your configuration and recreating the containers, clear your browser cache or perform a hard reload (Ctrl + F5) to make sure your browser isn't running an old cached version of the frontend.


## Upgrading database containers

The Compose files now pin MongoDB 9.0.2 and Redis 8.10.2. Fresh installations can use these images directly. Existing MongoDB 5 volumes require a staged upgrade before using the new Compose file.

1. Stop application writes and create a verified backup of MongoDB and Redis. Keep the previous Compose file and image tags for recovery. Do not delete persistent volumes.
2. Upgrade MongoDB through supported major versions: 5 → 6 → 7 → 8 → 9. At each step, first install the latest supported patch of the current major, follow that version's upgrade instructions, then set its feature compatibility version after validation. Never start MongoDB 9 against a MongoDB 5 data directory.
3. Before the final step, follow MongoDB's [standalone upgrade to 9.0](https://www.mongodb.com/docs/manual/release-notes/9.0-upgrade-standalone/). Replica sets require the corresponding replica-set procedure.
4. Test Redis 8 against a copy of your persistence files, including BullMQ jobs, before switching production traffic. Keep a pre-upgrade snapshot; do not assume newer RDB/AOF files can be read by the previous Redis version.
5. Start the updated application and check authentication, result writes, leaderboards, and queued email jobs. Recovery after a database format or feature compatibility change requires restoring the pre-upgrade backup into the matching old version.

Integration tests use disposable MongoDB/Redis containers and never upgrade existing application volumes.


## Security

Do not expose the Oxytype backend directly to the internet. Instead, place it behind a reverse proxy and configure the backend to only accept connections from the reverse proxy.

The backend's built-in rate limiting is based on the authenticated user's `uid` or, for unauthenticated requests, the client's IP address.

To determine the client's IP address, the backend checks the following sources in order:

1. `CF-Connecting-IP` (when requests are proxied through Cloudflare)
2. `X-Forwarded-For`
3. The source IP address of the HTTP connection

We recommend the following configuration:

- If you are **not** using Cloudflare, remove any incoming `CF-Connecting-IP` header in your reverse proxy before forwarding requests.
- Configure your reverse proxy to set the `X-Forwarded-For` header to the client's IP address.
- Configure the backend to only accept connections from the reverse proxy to prevent clients from spoofing trusted headers.


Sources:
- [cloudflare documentation for cf-connecting-ip](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip)
- [handling headers in traefik](https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers)


## Account System

Authentication runs inside the backend through [Better Auth](https://better-auth.com/docs/installation), using MongoDB for users, credentials, sessions, verification tokens, and auth rate limits. Accounts start fresh; no legacy authentication accounts or sessions are imported.

### Setup Better Auth

1. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32` and save it in `.env`. Keep the same secret across restarts and backend replicas.
2. Set `BASE_URL` to the public frontend origin. Compose sets `FRONTEND_URL` and `BETTER_AUTH_URL=BASE_URL/api/auth` automatically. The proxy strips `/api` before forwarding requests.
3. Serve the frontend and API on the same site over HTTPS outside localhost. Session cookies use HttpOnly; production HTTPS uses Secure cookies. API requests include cookies, and state-changing cookie requests require the configured frontend origin.
4. Configure SMTP for verification and password resets using the email settings below.
5. Optionally configure `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`. Register `BASE_URL/api/auth/callback/google` and `BASE_URL/api/auth/callback/github` as OAuth callback URLs. Configure provider apps for the deployment's origin.
6. Recreate the containers after changing environment variables.

MongoDB collections and indexes are created at startup; standalone MongoDB is supported. Sessions last seven days with daily renewal. Sensitive account operations require authentication within the last minute. Password or email changes and password resets revoke existing sessions; sign in again afterward.

### Update backend configuration

- update the `backend-configuration.json` file and add/modify
  ```json
  {
    "users": {
      "signUp": true,
      "profiles": {
        "enabled": true
      }
    }
  }
  ```

### Setup Recaptcha

- [create](https://www.google.com/recaptcha/admin/create) a new recaptcha token
  - label: `oxytype`
  - type: v2
  - domain: the domain of the frontend
- update the `.env` file with the site key from the previous step
  ```
  RECAPTCHA_SITE_KEY="your site key"
  RECAPTCHA_SECRET="your secret key"
  ```

If you host privately you can use these defaults:

```
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

### Setup email (optional)

To enable emails for password reset and email verification update the following config in `.env` file:

```
# email server config
# uncomment below if you want to send emails for e.g. password reset
EMAIL_HOST=mail.myserver   # your mailserver domain
EMAIL_USER=mailuser        # username to authenticate with your mailserver
EMAIL_PASS=mailpass        # password for the user
EMAIL_PORT=465             # port, likely 465 or 587
EMAIL_FROM="Support <noreply@myserver>"
```

## Enable daily leaderboards

To enable daily leaderboards update the `backend-configuration.json` file and add/modify

```json
{
  "dailyLeaderboards": {
    "enabled": true,
    "maxResults": 250,
    "leaderboardExpirationTimeInDays": 1,
    "validModeRules": [
      {
        "language": "english",
        "mode": "time",
        "mode2": "15"
      },
      {
        "language": "english",
        "mode": "time",
        "mode2": "60"
      }
    ]
  }
}
```

- language is one of the supported language
- mode can be `time` or `words`
- mode2 can be `15`,`30`,`60` or `120` if you picked `mode=time` or `10`,`25`,`50` or `100` if you picked `mode=words`.

## Configuration files

### env file

All settings are described in the [example.env](https://github.com/voltcrash/oxytype/tree/master/docker/example.env) file.

### backend-configuration.json

Configuration of the backend. Check the [default configuration](https://github.com/voltcrash/oxytype/blob/master/backend/src/constants/base-configuration.ts#L8) for possible values.

> [!NOTE]
> Configuration changes are applied only on container startup. You must restart the container for your updates to take effect.
