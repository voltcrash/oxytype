# Oxytype TUI Plan

Terminal client for oxytype. Same backend, same accounts. OpenTUI + Solid.

## Decisions

- Package: `tui/` → `@voltcrash/oxytype`. Runtime: Bun. UI: `@opentui/solid`.
- Logic: shared `packages/typing-core`, migrated incrementally out of frontend. No duplication.
- Auth: device flow (better-auth `deviceAuthorization`). TUI prints link + code, opens browser. Approval page: frontend `/device`.
- Captcha flows (signup, user report, quote submit/report): hand off to browser.
- Stats: everything split by `client: "web" | "tui"` — results, PBs, stats, streaks, leaderboards.
- Offline: full offline play. Queued results upload later with `offline: true` → history + stats only, no PBs/leaderboards. Queue entries >30d dropped (kept locally).
- Assets: ship English 200 + quotes index. Other languages/quotes downloaded on demand → `~/.cache/oxytype`, versioned. Uncached + offline → message + fallback to English.
- Parity: everything web does. Non-terminal-possible features listed in `tui/MISSING.md`.
- Distribution: npm only (`bunx @voltcrash/oxytype`).

## Rules for every phase

- One phase = one small PR. Lint, typecheck, tests green.
- Frontend behavior unchanged during core extraction phases.
- Update `tui/MISSING.md` whenever a feature is skipped/approximated. Create it (template from D1) if absent.

---

## Stage A — Shared core

### A1. Scaffold `packages/typing-core`

- Package w/ tsdown-config, typescript-config, oxlint-config, vitest.
- Empty `index.ts`. Registered in pnpm + turbo.
- Done: `pnpm build-pkg` + `test-pkg` pass.

### A2. Parity fixture harness

- Record keystroke fixtures (input + timings) from web for a few modes.
- Snapshot current frontend output (completed event + hash).
- Done: fixtures + snapshot tests in core (target the frontend modules for now).

### A3. Move pure utils

- Stats math helpers (wpm, raw, acc, consistency, std dev, kogasa).
- Frontend imports from core.
- Done: fixtures pass.

### A4. Move wordset + language types

- `wordset.ts`, language/quote types. Loader takes injected `fetchJson`.
- Done: frontend uses core; fixtures pass.

### A5. Move words generator (base modes)

- time / words / custom-count, punctuation, numbers.
- Done: fixtures pass.

### A6. Move words generator (quote, custom text, zen)

- Quote selection, custom text, zen mode. Inject storage/fetch.
- Done: fixtures pass.

### A7. Move language-specific helpers

- british-english, english-punctuation, poetry, wikipedia (fetch injected), lazy-mode.
- Done: fixtures pass.

### A8. Move funbox word transforms

- Pure funbox functions only (word gen/transform). Visual hooks stay in frontend.
- Done: fixtures for each word-transforming funbox pass.

### A9. Move input diff engine

- Correct/incorrect/extra/missed chars, word advance, backspace rules, stop-on-error, confidence modes.
- Done: fixtures pass.

### A10. Move timer + per-second stats

- Timer as event emitter; wpm/raw/errors history per second; afk detection.
- Done: fixtures pass.

### A11. Move completed-event builder + hash

- Build payload, keySpacing/duration stats, `object-hash`.
- Done: hash identical to snapshot.

### A12. Core test engine facade

- `createTestSession(config, deps)` → events (`word`, `input`, `tick`, `finish`). Headless.
- Frontend test-logic consumes it.
- Done: fixtures pass; frontend e2e manual smoke OK.

### A13. Practice / weak-spot / pace caret logic

- practise-words, weak-spot, pace-caret math (no rendering).
- Done: fixtures pass.

---

## Stage B — Backend + schemas

### B1. `client` field in schemas

- `client: "web" | "tui"` on completed event (default `web`). Frontend sends `web`.
- Done: hash tests updated; backend accepts.

### B2. Store `client` on results

- DB migration + column. Result history filter by client.
- Done: integration tests.

### B3. Split PBs by client

- Migration; PB read/write keyed by client.
- Done: integration tests.

### B4. Split stats + streaks by client

- Tests started/completed, time typing, streaks.
- Done: integration tests.

### B5. Split leaderboards by client

- All-time + daily keys partitioned by client. Contract `client` query param.
- Done: integration tests.

### B6. `offline` flag

- `offline?: boolean` on completed event. Skip PB + leaderboard; enforce 30d max age.
- Done: integration tests.

### B7. Anticheat review for TUI

- Collect terminal key timings; tune thresholds per client if needed. Update `docs/ANTICHEAT.md`.
- Done: real TUI fixtures pass anticheat.

### B8. Non-browser client access

- Requests without `Origin` allowed for bearer-auth API routes. CORS unaffected for web.
- Done: curl with bearer token works.

### B9. Device auth plugin

- Enable better-auth `deviceAuthorization`. Configure verification URI → frontend `/device`.
- Done: integration test for code → approve → token.

---

## Stage C — Web frontend additions

### C1. `/device` page

- Code entry (prefilled from query), approve/deny, requires login.
- Done: manual flow with curl-simulated client.

### C2. Web/TUI toggle on profile + account

- Show PBs/stats/history per client.
- Done: UI works for both.

### C3. Web/TUI toggle on leaderboards

- Done: UI works for both.

---

## Stage D — TUI foundation

### D1. Scaffold `tui/`

- Bun + `@opentui/solid`, Solid JSX transform, lint/typecheck/test wiring, turbo tasks.
- Hello-world screen.
- Create `tui/MISSING.md`: intro + table `Feature | Status (missing/approximated) | Reason | Approximation`. Seed w/ known: TTS, sounds, custom fonts, background images, screenshots, visual funboxes.
- Done: `pnpm --filter @voltcrash/oxytype dev` renders; `tui/MISSING.md` exists.

### D2. App shell + router

- Screen stack (test, result, settings, account, leaderboards, ...), global keybinds, quit.
- Done: navigate between placeholder screens.

### D3. Paths + local storage

- XDG paths: config, cache, data. JSON read/write helpers w/ schema validation.
- Done: unit tests.

### D4. Local config

- Full config schema from `@oxytype/schemas`, defaults, persistence.
- Done: config survives restart.

### D5. Theme engine

- Load theme JSON → truecolor; 256-color fallback. Ship default theme.
- Done: switch theme at runtime.

### D6. Bundled assets

- Ship English 200 + quotes index. Asset loader interface for core.
- Done: core loads English offline.

---

## Stage E — Typing test (offline)

### E1. Word rendering

- Render words w/ correct/incorrect/extra colors. Line wrapping, scroll to active line.
- Done: static words render.

### E2. Caret

- Caret styles (line/block/underline approximations), smooth off.
- Done: caret follows input.

### E3. Input wiring

- Key events → core session. Backspace, ctrl+backspace, space rules.
- Done: complete a words-10 test.

### E4. Live stats bar

- Timer/progress, live wpm/acc/burst (per config).
- Done: matches web values on same fixture.

### E5. Restart + quick restart

- Tab/esc behavior per config, repeat test.
- Done: works.

### E6. Mode bar

- time / words / quote / zen / custom, punctuation, numbers selectors.
- Done: all modes start.

### E7. Result screen — numbers

- wpm, raw, acc, consistency, chars, time, test type.
- Done: matches core output.

### E8. Result screen — chart

- wpm/raw/errors chart (braille/block).
- Done: renders for 15s + 120s tests.

### E9. Local history

- Save results locally. Simple history list.
- Done: survives restart.

### E10. Pace caret

- Render pace caret from core.
- Done: works for pb/average/custom (local data).

---

## Stage F — Account + API

### F1. API client

- Contracts client + Bearer adapter, base URL from env/config, timeouts.
- Done: public endpoints callable.

### F2. Device login

- Request code → print URL + code → open browser → poll → store token (0600).
- Done: login works end to end.

### F3. Logout + session check

- Revoke token, handle expired token gracefully.
- Done: works.

### F4. Result upload (online)

- Submit w/ `client: "tui"`. Show PB / errors on result screen.
- Done: result visible on web (TUI toggle).

### F5. Offline queue

- Queue failed/offline results; upload on reconnect w/ `offline: true`; drop >30d.
- Done: offline test uploads later, no PB.

### F6. Config sync

- Pull on login, push on change, conflict = server wins on login.
- Done: change on web reflects in TUI.

### F7. On-demand asset download

- Download language/quote files to cache, version check, offline fallback message.
- Done: switch to non-English language once online, then works offline.

---

## Stage G — Screens (parity)

### G1. Command palette

- Same command list as web where applicable; own hotkey.
- Done: change mode/theme/language via palette.

### G2. Settings — behavior section

### G3. Settings — input section

### G4. Settings — appearance section

### G5. Settings — theme section

### G6. Settings — danger zone (reset, import/export config)

### G7. Account — profile + PBs

### G8. Account — result history + filters

### G9. Account — tags (CRUD, active tags)

### G10. Account — presets (CRUD, apply)

### G11. Leaderboards (all-time, daily, language, TUI/web)

### G12. Public profile view (by username)

### G13. Quote search + favorites

### G14. Custom text editor + saved texts

### G15. Challenges

### G16. Funboxes — word-level (via core)

### G17. Funboxes — terminal approximations of visual ones

### G18. Layout emulator

### G19. Practice words / weak spot modes

### G20. PSAs / server announcements

### G21. Browser handoff for captcha flows (signup, reports, quote submit)

### G22. Replay (if feasible, else MISSING)

- Each G phase done: feature matches web or listed in `MISSING.md`.

---

## Stage H — Ship

### H1. `tui/MISSING.md` audit

- Walk every web feature; mark ported / approximated / missing + reason.

### H2. Screen snapshot tests

- OpenTUI test renderer snapshots for key screens.

### H3. Error reporting + logs

- Log file in data dir, `--debug` flag.

### H4. CLI flags

- `--version`, `--help`, `login`, `logout`, `--mode`, `--time`, etc.

### H5. npm packaging

- `@voltcrash/oxytype`, bin entry, Bun engine check, files whitelist.

### H6. Release workflow

- Publish via `packages/release` / CI.

### H7. Docs

- README section + `docs/TUI.md`.
