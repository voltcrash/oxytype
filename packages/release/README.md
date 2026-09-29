# Oxytype release tool

This tool releases only the configured Oxytype repository. Its default GitHub target is `voltcrash/oxytype`; it refuses the upstream owner.

Copy `example.env` to `.env` in this directory. Set `GITHUB_TOKEN` for releases. Configure `OXYTYPE_FIREBASE_PROJECT_ID` before a frontend deploy and `BE_HOST`, `BE_USER`, and `BE_SCRIPT_PATH` before a backend deploy. Cloudflare cache purging is optional and requires both `CF_ZONE_ID` and `CF_API_KEY`.

Run `pnpm release-dry` to inspect commands before a release. `pnpm release-no-deploy` builds and tags without deploying. Frontend preview deployments also require the Firebase project ID.
