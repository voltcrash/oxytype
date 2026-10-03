# Result validation and anticheat

The Worker includes baseline validation in both `MODE=dev` and `MODE=production`.
Valid results can save without an anticheat bypass. All users receive score and
telemetry checks; verification/leaderboard opt-out exempts only the bot heuristic.

## Enforced relationships

- Finite, nonnegative numbers; safe integer character/restart counts.
- WPM = correct whole-word characters × 12 / duration; raw WPM = typed
  characters × 12 / duration. Score/consistency rounding tolerance: 0.011.
- Existing speed caps: 350 WPM/raw WPM, or 420 for 10-word tests. AFK time
  cannot exceed duration. Completed timed tests cannot end over 0.25 seconds
  early; bailouts and infinite tests have no fixed-time minimum.
- Restart count matches abandoned-test records; their durations sum to the
  reported abandoned time. On a first save, abandoned time grants no credit.
- Chart arrays align, contain valid numbers and fit the duration. Their
  consistency scores match the browser calculation. `toolong` requires a
  test longer than 122 seconds.
- Keyboard gaps number one fewer than holds. Nonempty, completed, non-zen
  timelines span the test within 100 ms. Key consistency uses the browser's
  exclusion of the last gap. Both key sentinels must appear together and only
  after 122 seconds.
- Server timestamps bound result duration plus credited abandoned time against
  the previous save; first saves use server account creation time. The existing
  one-second allowance remains. Legacy accounts without creation time fall
  back to the epoch. Database read failures fail closed.

Accuracy cannot be inferred from final character counts: corrected mistakes
still reduce accuracy. Keyboard counts need not equal characters because IME,
mobile input and automatic text can insert characters without key events.
Pre-start holds, unobserved releases and empty keyboard telemetry are supported.
Browsers may [coarsen clocks](https://www.w3.org/TR/hr-time-3/); quantization alone
is not treated as bot evidence.

## Narrow bot signature

The existing gate applies to time tests above 130 WPM and shorter than 122 seconds,
for unverified users participating in leaderboards. Missing key arrays return
464. Otherwise, at least 100 interior holds **and** 100 interior gaps must each
be positive and fixed within 0.01 ms to return 465. Endpoints, sparse composition
telemetry, zero placeholders and variation in either channel avoid this signature.

`users.autoBan.enabled` defaults false. Keep it disabled while reviewing real
typing samples and rejection logs. If enabled, rejected bot requests create
rolling strikes; exceeding `maxCount` within `maxHours` bans the account. These
are request strikes, not deduplicated test identities. Audits/strikes commit
atomically despite rejection; rejected submissions grant no result, PB, XP,
typing-time or leaderboard credit. Concurrency retries cannot duplicate those
writes or the ban notification.

| Status | Meaning |
| --- | --- |
| 461 | Invalid configured payload hash |
| 462 | Duration does not fit the server save window |
| 463 | Inconsistent score, duration, chart or key data |
| 464 | Missing key data under the high-speed bot gate |
| 465 | Fixed timing signature detected |
| 466 | Duplicate result |

## Limits and rollout

This is consistency validation plus a deliberately narrow bot heuristic.
Client telemetry remains forgeable; coherent fabricated scores, varied automated
timing and replays with a different hash can evade it. The public, unkeyed payload
hash detects inconsistencies, not authenticity. No server-issued test challenge,
source-text replay or classifier calibrated on a labeled human corpus is provided.
High speed alone is not evidence of cheating.

Production-mode D1 tests cover saves/rejections, exemptions, concurrency, expired
strikes and absence of progression on rejection. Browser-reducer fixtures cover
normal typing, coarsened clocks, IME, pre-start keys, bailouts and zen. This is
synthetic compatibility evidence; review real user samples before tightening rules.

The previously deployed staging Worker predates this implementation. Follow
[operations](CLOUDFLARE_OPERATIONS.md) to migrate/redeploy, configure OAuth/captcha
and repeat signup, save, refresh and sign-out/sign-in checks with production mode.
Monitor `anticheat_rejected` audits by reason and important-audit growth.

```sh
cd backend
pnpm vitest run __tests__/d1/anticheat.spec.ts
cd ..
pnpm oxlint --type-aware --type-check --format agent
pnpm build-be
```
