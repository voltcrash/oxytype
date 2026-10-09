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
scripts first run `assets`, which copies English 200, English quotes and QWERTY from
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
  word/time/section limits. Custom starts with the shared default text; use the
  palette's `View custom` command to edit or load saved text.
- Ctrl+R restarts; F7 repeats; F8 finishes zen or bails out of an unlimited test.
  The configured Tab/Esc/Enter quick restart also applies. Long tests require
  Shift plus that key, or explicit Ctrl+R. Literal tabs/newlines retain their
  input meaning; use F7/F8 when the terminal cannot distinguish modified keys.
- Enter on results starts the next test; `r` opens replay. Ctrl+O opens history;
  up/down select, Enter shows details, Tab switches local/TUI/web, `f` edits
  filters and `x` clears them. Valid results save when `resultSaving` is enabled.

The bundled English sources work offline. Missing languages fall back to
English without changing the stored preference. PB, average, daily and last
pace use matching local history; tag PB uses active tags, custom pace uses the configured WPM.

Ctrl+A opens account: Enter logs in through browser device consent, `r`
reconnects, `l` revokes/logs out and Esc cancels pending consent. Online results
show upload/PB feedback; delayed uploads count toward history/stats only.
Login pulls server config; validated changes sync back. Settings F2/F3 change
languages; downloads cache for offline use.

Ctrl+P/Ctrl+K open the searchable command palette. Settings have behavior,
input, sound, caret, appearance, theme, visibility and danger sections. Reset
and deletion actions open confirmation lists; config import/export accepts
JSON or file paths. Synced settings without terminal effects show `web only`.

The palette opens tags, presets, public profiles, quotes, custom texts,
challenges, funboxes and announcements. Screen footers show their keys. Custom
text editing accepts bracketed paste and Enter/Tab; Escape finishes editing.
Practice commands on results select missed words, pairs and slow words.
Practice/challenge settings are temporary, and practice results are not saved.

Signup, quote submission and report commands show a browser URL, with Enter
to open it and `c` to copy. Quote/profile screens offer `b` to report the selected
item. Complete captcha in the browser; sign in there when requested.

`custom-texts.json` stores drafts and saved texts. `active-tags.json` and
`quote-favorites.json` isolate cached selections by account and API origin.
Layouts, quote/language assets and challenge scripts download into the asset
cache. Shared weak-spot learning and the latest replay last for this process.

Stage G screens, controls, verification and shared-code changes:
[TUI_SCREENS.md](../docs/TUI_SCREENS.md).

Connection settings live in `network.json` beside `config.json`; environment
overrides are `OXYTYPE_API_URL`, `OXYTYPE_ASSET_URL`, `OXYTYPE_TIMEOUT_MS`.
Defaults use the official site. Account/API/storage details and verification:
[TUI_ACCOUNT_API.md](../docs/TUI_ACCOUNT_API.md).

Stage E verification and terminal approximations:
[TUI_TYPING_TEST.md](../docs/TUI_TYPING_TEST.md).

Terminal gaps and approximations are tracked in [MISSING.md](MISSING.md).
