# TUI web integration

Stage C adds terminal device consent and client selection to the existing web
frontend. Deploy the Stage B backend and D1 migrations first; see
[TUI_BACKEND.md](TUI_BACKEND.md).

## Device consent

Open `/device?user_code=CODE` or enter the terminal's code at `/device`. Guests
see the existing sign-in form. The query survives sign-in and refresh.

Continue reviews and claims the request for the signed-in account. The page
shows the account, terminal client and code before explicit approval or denial.
Only `oxytype-tui` requests can be reviewed. Users must match the code against
their own terminal and approve a request they started. Account/code changes
discard pending UI state; late responses cannot restore it.

After approval, return to the terminal to finish polling. Denial, invalid codes
and API errors stay visible. Device tokens are handled by the terminal; the web
page uses the existing browser session. Backend polling, ownership, expiry and
revocation rules remain authoritative.

## Client selection

Account and public profile pages accept `?client=web` or `?client=tui`. Missing
or invalid values select web. The radio control preserves the other query
parameters and hash. Profile-sharing and leaderboard links retain the selected
client.

The account view switches PB cards and detailed tables, typing totals, XP,
streaks, current/yearly activity, history, charts, filtered aggregates and CSV
exports together. History tag edits retain the result's client. Offline rows
have a history/stats-only indicator; CSV includes `client` and `offline` columns.
Existing CSV columns retain their order.

Public profiles switch the backend-provided client data. Identity, profile
editing, tag names and settings remain shared. Web typing continues to use the
web snapshot, last result, averages and tag PBs.

All-time, daily and weekly leaderboards include client selection in URL state,
API queries, entries/rank caches and eligibility checks. Switching clients
resets pagination and pending jump-to-user navigation. Current and previous
periods use the selected partition. Terminal rank memory updates its account
cache without writing web rank memory.

## Cache boundaries

Public profiles include username and client in the query key. Private account
and activity queries include account ID and client. Web and terminal histories
use separate collections. Legacy result rows default to web. Terminal history
loads on demand and cannot change web last-result or PB state.

## Verification

- Frontend: 1,823 tests; includes consent UI/API errors, routing, URL defaults,
  accessible selectors, client query partitions, history/tag mutations and
  activity archive races.
- Backend: 98 D1 integration tests against the Stage B contracts.
- Frontend lint/typecheck, formatting and production build pass.
- Local browser + curl smoke against ephemeral D1: issue/pending → guest
  sign-in gate → explicit browser approval → bearer token → account API; denial
  and invalid-code handling also pass.
- Seeded Web/TUI data verifies account PBs/totals/history/CSV, detailed PB tables,
  public profile switching and all three leaderboard entry/rank partitions.
  Browser reports no page errors.

The smoke uses a temporary local session fixture to enter the authenticated
browser state. External OAuth redirects/provider authentication were not run.
No remote database changes or full terminal UI are needed for these checks.
