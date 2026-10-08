# TUI backend contracts

Stage B provides backend support for the terminal client. The `/device` approval
page and web/TUI controls belong to Stage C; the full TUI begins in Stage D.

## Client identity and account data

`client` accepts `web` or `tui`. Completed payloads default to `web`; the shared
builder sends it explicitly. Client identity is hashed with the payload. Older
web payload hashes that omitted `client` remain accepted only in the web
partition. History responses carry the persisted client, including legacy rows.

Optional `client` query parameters select history, last result, account/profile,
PBs, tags' PBs, stats, streaks, activity, rank memory, public stats/histograms and
all-time/daily/weekly leaderboards. Omission selects web. IDs still provide
owner-checked access to an individual result of either client.

PBs, tag PBs, typing totals, XP, streaks, activity, bananas and rank memory stay
independent. Account identity, tags' names, settings, themes, favorites, inventory
and moderation flags stay shared. Leaderboard reward jobs retain their client;
placement XP credits that client's balance. Legacy web reward IDs remain stable.

`client_profiles` stores rows by `(uid, client)`. Web fields in `users.data` remain
the compatibility projection; user mutations write that projection and the web
profile row in the same version-guarded batch. Terminal profile rows join that
batch. New terminal accounts start empty. Moderation/reset/deletion cover both
clients; clearing one client's PBs preserves the other client's placements.

Migrations `0009`–`0013` add the result discriminator/history index, profile rows,
activity and weekly ranking partitions, and Better Auth device codes. Existing
results, counters, PBs, streaks, activity and rankings remain web data. Apply
pending D1 migrations before deploying the backend.

## Offline results

Send `offline: true`, the original completion timestamp, and a freshly computed
hash. Offline saves must be at most 30 days old and cannot be in the future
(1-second clock tolerance). They undergo normal score/key/replay validation and
submission deduplication. They retain their original timestamp in history.

They credit completed tests, typing time and dated activity/streak stats. They
never set regular/tag PBs or enter any leaderboard; they award no XP, daily bonus,
bananas or streak badge. Abandoned-test time/restarts have no server clock bound,
so they are not credited. Out-of-order uploads never move a streak backwards.
Updating an offline result's tags cannot promote it to a tag PB.

## Native requests and device login

Bearer-authenticated API requests can omit `Origin`. Auth mutations can do so
with a valid bearer session and no browser cookie/Fetch Metadata context.
Cookie-origin checks and web CORS remain enabled. Anonymous native access is
limited to the device code/token endpoints in the auth wrapper.

The installed [Better Auth device plugin](https://better-auth.com/docs/plugins/device-authorization)
uses client ID `oxytype-tui`, 10-minute codes and a 5-second polling interval:

1. `POST /api/auth/device/code` with `{"client_id":"oxytype-tui"}`.
2. Show `verification_uri_complete` and `user_code`; verification URI is
   `<FRONTEND_URL>/device`.
3. The signed-in browser calls `GET /api/auth/device?user_code=...` to claim the
   code, then `POST /api/auth/device/approve` or `/deny` with `{"userCode":"..."}`.
4. Poll `POST /api/auth/device/token` with `device_code`, `client_id` and
   `grant_type: "urn:ietf:params:oauth:grant-type:device_code"`. Handle
   `authorization_pending`, `slow_down`, `access_denied` and `expired_token`.
5. Use the returned `access_token` as a bearer session. Normal sign-out,
   revocation and disabled-account rules apply. A redeemed code cannot be reused.

D1 tests exercise approval ownership, denial, expiry, polling limits, native
profile reads and sign-out. A local D1-backed HTTP smoke also verifies real curl
GET/PATCH requests without Origin, persisted config updates and invalid-token
rejection. No remote database changes are required for those checks.

## Terminal timing evidence

Traditional terminals expose key arrivals, without key releases. Record each
press with its actual arrival time; preserve zero duration placeholders and zero
unknown overlap. Do not invent hold durations. Short terminal results need key
timing; the existing long-test cutoff remains. See [ANTICHEAT.md](ANTICHEAT.md).

`packages/typing-core/scripts/record-terminal-fixture.ts` is a raw-PTY collector
through the shared headless session, separate from the future UI. Its committed
fixture records automated input through real PTY transport, not human calibration.
Unit and production-mode D1 tests accept that fixture, allow varied high-speed
arrival gaps and reject fixed terminal timing/replays. Numeric score thresholds
stay unchanged; unknown hold durations are excluded from terminal signatures.
Human TUI calibration remains part of later interactive testing.
