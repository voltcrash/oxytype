# Terminal screens (Stage G)

Stage G sits above Stage F (`feat/tui-account-api-stage-f`). It implements
G1–G22 with the explicit parity exceptions in [MISSING.md](../tui/MISSING.md).
Stage H packaging, CLI flags and release automation remain separate work.

## Controls

Ctrl+P or Ctrl+K opens the command palette. Search finds settings, navigation,
practice and browser actions; Enter runs an item, Escape backs out. Settings
and palette inputs accept bracketed paste. Ctrl+C always exits.

| Phase | Screen/feature | Controls |
| --- | --- | --- |
| G1 | Shared command matching, nested/single-list palette | Search, ↑↓/Tab select, Enter run |
| G2–G4 | Behavior/input/sound/caret/appearance/visibility settings | Tab section, `/` search, ←→ inline options, Enter edit, `r` reset selected setting |
| G5 | Themes, favorites, active custom colors, built-in random rotation | Theme settings and palette; custom palette color inputs |
| G6 | Config reset/import/export | Danger section/palette; reset confirms, import accepts JSON or file path, export refuses existing files |
| G7 | Account stats and personal bests | Ctrl+A; Tab TUI/web, ↑↓ PB pages, `r` reconnect/reload |
| G8 | Local/TUI/web history, filters and details | Ctrl+O; Tab source, ↑↓ select, Enter details, `f` JSON filters, `x` clear, `r` reload |
| G9 | Tags CRUD/active selections | `a` add, `e` rename, `d` delete (confirmation), Space/Enter activate |
| G10 | Full/partial preset CRUD/apply | `a` add (`name; group,group`), `e` rename, `s` overwrite (confirmation), `d` delete, Enter apply |
| G11 | All-time/daily/weekly-XP boards | Ctrl+L; Tab board, `c` client, `l` language, `m` mode/amount, ←→ pages, Enter profile |
| G12 | Public profile | `/` username, Tab TUI/web, ↑↓ PB pages, `r` reload |
| G13 | Quote ID/text/source search and favorites | `/` search, `l` language, `f` favorite, `v` favorite-only, Enter type, `r` reload |
| G14 | Multiline custom text and saved library | `n` new, `e` edit, `o` options, `s` save, `l` load, `d` delete, Enter type; in editor: arrows, Home/End, Enter newline, Tab literal tab, Escape finish editing |
| G15 | Challenge selection and verification | `/` search, Enter load; result shows pass/fail reasons |
| G16–G17 | Word funboxes and terminal visibility/memory effects | `/` search, Enter toggle compatible effects; unsupported effects show browser notice |
| G18 | Layout emulator and text keymap | Input/appearance settings; layout assets cache, QWERTY is bundled |
| G19 | Missed words/pairs/slow-word practice and weak spot | Result palette: Practice words; Stop practice/challenge restores ordinary settings |
| G20 | Public announcements | Palette: View announcements; ↑↓/PageUp/PageDown scroll, `r` reload |
| G21 | Captcha browser handoffs | Palette: signup, submit quote, report quote/user; quote/profile `b` reports selected item; handoff Enter opens, `c` copies |
| G22 | Latest in-memory event replay | Result `r`; Space play/pause, ←→ seek 1 second, Home/End, `s` cycle 0.5/1/2/4× |

## Behavior and storage

- Account/history/profile/board requests use the existing typed contracts.
  Public views work as guest. Private views clear data on account changes;
  stale/disposed requests cannot replace current data. Failures show retry.
- History downloads all server pages (1,000 per request), then filters locally.
  `after`/`before` are inclusive Unix milliseconds; `mode2` is a string.
- Presets follow config groups. Full and behavior presets replace active tags;
  theme-only presets preserve them. Active tags are snapshotted into the next
  test and matching local tag PB queries.
- Config uses shared metadata, defaults, migrations and setting rules. Local
  edits restart the prepared test even from another screen; remote edits preserve
  the running test. `no_quit` blocks restart, bail-out, navigation and bulk edits;
  Ctrl+C still exits.
- Challenge/practice config is an in-memory overlay; it does not overwrite the
  synced preset or saved custom text. Practice results are invalid for saving.
  Unsupported/font-dependent challenges are rejected. Scripts download/cache.
- Replay uses saved input snapshots, including automatic deletions and regression,
  and cannot mutate the typing session or upload a result. Old history lacks raw
  events; replay survives only until process exit.
- Browser links carry a validated action and quote language/ID or username.
  The web controller preserves it through login and opens the existing captcha
  form once. The terminal never submits those forms.
- Drafts/library: `custom-texts.json`. Account/origin-bound active selections:
  `active-tags.json`, `quote-favorites.json`. All writes use atomic JSON storage
  and flush on quit. Weak-spot learning is retained across tests in one process.

## Shared code

The web and TUI share config metadata/setter ordering, funbox validation,
command matching, challenge setup/verification, layout character mapping,
word generation, practice selection and weak-spot math. Browser wrappers keep
their DOM, notification and auth behavior; terminal components own rendering,
paste handlers, caret work and playback/countdown lifecycles.

## Verification

Run from repository root:

```sh
pnpm lint-tui
pnpm lint-fe
pnpm lint-pkg
pnpm test-tui
pnpm test-fe
pnpm test-pkg
pnpm build-fe
python3 tui/scripts/smoke-pty.py
python3 tui/scripts/smoke-account-pty.py
python3 tui/scripts/smoke-screens-pty.py
```

New regression coverage exercises TUI/web profile switching, zero-based board
pagination, tag actions, bracketed paste, handoff links, replay controls,
announcements/retry, quote selection, cached favorites, text/tag persistence,
stale requests, no-quit guards, practice restoration and preset group semantics.
Shared suites check layout modifiers, every challenge setup, challenge failure
rules, recorded-event replay and browser handoff validation/login preservation.
