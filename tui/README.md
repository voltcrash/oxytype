# Oxytype terminal client

`@voltcrash/oxytype` runs oxytype in a terminal with OpenTUI and Solid. It
requires Bun; OpenTUI loads its native renderer through Bun FFI.

```sh
pnpm dev-tui
pnpm lint-tui
pnpm test-tui
bun test __tests__/app.test.tsx # from tui/, after `bun run assets`
python3 tui/scripts/smoke-pty.py # from root; Unix PTY CLI smoke
python3 tui/scripts/smoke-account-pty.py # device/API/queue/cached-assets PTY smoke
```

`bunfig.toml` preloads the OpenTUI Solid JSX transform for the app and tests.
Tests run with `bun test`; Node cannot load the renderer. The `dev` and `test`
scripts first run `assets`, which copies English 200 and English quotes from
`frontend/static` into the generated `assets/` directory.

Typecheck uses the root oxlint flow. The tsconfig includes the DOM lib because
Solid's JSX element type references DOM nodes; OpenTUI renders no DOM.

OpenTUI is pinned to 0.5.10. Later releases declare Node >=26.4, which strict
engine checks reject on the repository's Node 24 toolchain.

## Structure

- `router/`, `shell/`: screen stack and global keys. Ctrl+C always quits;
  screens handle other keys before esc/back and ctrl+t/s/a/l navigation.
- `storage/`: XDG config/cache/data directories (`AppData` on Windows) and
  atomic, schema-validated JSON files.
- `config/`: `config.json` with the shared web defaults, migration and
  validation. Writes are serialized and flushed on quit.
- `theme/`: shared palettes resolved to opaque RGB. OpenTUI emits truecolor
  or downsamples to xterm-256 based on its terminal detection.
- `assets/`: core `FetchJson` adapter for packaged, then cached, assets.
- `api/`, `auth/`, `account.ts`: contract/Bearer requests, device consent, secure
  credentials, session/reconnect handling and account screen controls.
- `test/`: shared-session input, offline word generation, wrapped letter/caret
  rendering, live stats, mode selectors and local pace.
- `results/`: atomic `history.json` storage, matching local PB/average pace
  queries, terminal result charts and an account-bound offline upload queue.

## Typing

Start typing to begin. Backspace and Ctrl+Backspace follow the core's confidence,
freedom and stop-on-error rules. Paste is disabled during tests.

- F2 cycles time/words/quote/zen/custom; F3/F4 toggle punctuation/numbers.
- F5/F6 change time, word count, quote length or custom limit. F9 changes custom
  word/time/section limits. Custom starts with the shared default text; its editor
  arrives in Stage G.
- Ctrl+R restarts; F7 repeats; F8 finishes zen or bails out of an unlimited test.
  The configured Tab/Esc/Enter quick restart also applies. Long tests require
  Shift plus that key, or explicit Ctrl+R. Literal tabs/newlines retain their
  input meaning; use F7/F8 when the terminal cannot distinguish modified keys.
- Enter on results starts the next test. Ctrl+O opens local history; up/down
  change history pages. Valid results save when `resultSaving` is enabled.

The bundled English sources work offline. Missing languages fall back to
English without changing the stored preference. PB, average, daily and last
pace use matching local history; custom pace uses the configured WPM.

Ctrl+A opens account: Enter logs in through browser device consent, `r`
reconnects, `l` revokes/logs out and Esc cancels pending consent. Online results
show upload/PB feedback; delayed uploads count toward history/stats only.
Login pulls server config; validated changes sync back. Settings F2/F3 change
languages; downloads cache for offline use.

Connection settings live in `network.json` beside `config.json`; environment
overrides are `OXYTYPE_API_URL`, `OXYTYPE_ASSET_URL`, `OXYTYPE_TIMEOUT_MS`.
Defaults use the official site. Account/API/storage details and verification:
[TUI_ACCOUNT_API.md](../docs/TUI_ACCOUNT_API.md).

Stage E verification and terminal approximations:
[TUI_TYPING_TEST.md](../docs/TUI_TYPING_TEST.md).

Terminal gaps and approximations are tracked in [MISSING.md](MISSING.md).
