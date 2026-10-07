# Oxytype production release helpers

This package supplies the daily Cloudflare production workflow with release
planning, changelog, date-version and site-history helpers. Deployment uses the
explicit Wrangler production commands; Docker publication follows GitHub release
publication. See [Cloudflare operations](../../docs/CLOUDFLARE_OPERATIONS.md).

Release versions use the UTC date in `YY.MM.DD` format, with a two-digit year
and zero-padded months and days. For example, October 4, 2026 is `26.10.04`
in `package.json` and Docker image tags, and `v26.10.04` in Git tags. Production
GitHub release titles omit the `v` prefix.
The release date is captured when the release starts, independently of the
previous version. Publication timestamps retain their full ISO year.

The production workflow permits one tagged release per UTC day. Retried runs
skip a completed production release; conflicting date tags/releases fail before
deployment. For an additional deployment that day, use the explicit Cloudflare
production commands in [production setup](../../docs/PRODUCTION_SETUP.md).

Frontend build IDs remain separate timestamp-and-commit identifiers for cache invalidation and diagnostics.

The production workflow refreshes `frontend/static/release.json` before building.
The snapshot contains the ten newest public releases and includes the planned
release notes. Drafts and prereleases are excluded. Ordinary frontend builds use
the checked-in snapshot; the footer and history modal fetch the site-hosted file.
Older history is linked to GitHub.

The **Production release** [GitHub workflow](../../.github/workflows/production-release.yml)
checks for new commits at 00:17 UTC, or manually from `main`. It skips deployment
and publication when no commits have been added since the last production release.
Otherwise, it deploys the complete production Worker site and publishes a
date-named release containing all changes since that release. Delayed runs and
retries use the UTC date when release planning executes, while retaining the
run's original `main` snapshot. See [production automation setup](../../docs/PRODUCTION_SETUP.md#production-releases)
for required Actions inputs and first-release behavior.
