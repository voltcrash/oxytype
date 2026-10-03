# Self-hosting

Deploy the API with Cloudflare Workers, D1 and Queues using Wrangler. Follow
[Cloudflare operations](CLOUDFLARE_OPERATIONS.md) for resources, migrations,
secrets, OAuth callbacks, integration setup and cutover/rollback.

`backend/wrangler.jsonc` currently targets **staging**. Create a separate reviewed
config and resources for your deployment; preserve the auth secret across updates.
Review the built-in [anticheat policy](ANTICHEAT.md) before enabling production
result saves; keep automatic bans disabled during initial monitoring.

Host `frontend/dist` using static hosting or the [frontend Docker image](../docker/BUILD.md).
Set its API URL to the Worker URL plus `/api`; trust the frontend origin in the
Worker. Google/GitHub OAuth, captcha and quote publishing require your
own credentials. Prefer a same-site HTTPS frontend/API route for browser cookies.

Docker Compose now runs the frontend only. Existing Mongo/Redis volumes are not
removed by this change; retain/export them before any later data cutover. The
preserving importer is offline tooling, not an automatic import on deployment.
