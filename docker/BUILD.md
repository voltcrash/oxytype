# Frontend Docker hosting

The backend deploys through Wrangler; there is no backend container or Mongo/Redis
Compose dependency. See [Cloudflare operations](../docs/CLOUDFLARE_OPERATIONS.md).

Copy `docker/example.env` to `docker/.env`, set `OXYTYPE_BACKEND_URL` to the Worker
URL including `/api`, then run `pnpm docker`. Trust the frontend's origin in the
Worker. Terminate HTTPS through your hosting/reverse proxy for production.

Build the static frontend image from the repository root:

```sh
docker build -f docker/frontend/Dockerfile -t oxytype-frontend .
```

The image replaces its API/captcha placeholders on startup. Backend secrets belong
in Wrangler, never in frontend environment variables. Existing production database
volumes require a deliberate export/cutover; do not run Compose volume deletion.
