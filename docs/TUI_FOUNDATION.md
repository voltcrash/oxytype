# TUI foundation

Stage D adds the `tui/` package (`@voltcrash/oxytype`): an OpenTUI + Solid app
on Bun with navigation, local storage, config, themes and offline assets. The
typing test starts in Stage E. Package workflow: [tui/README.md](../tui/README.md).

## Shared code

The core now owns the web default config, config migration (legacy values,
schema repair, default merge), theme palettes and custom-theme conversion. The
frontend re-exports them, so web imports and behaviour are unchanged. `sanitize`
moved to `@oxytype/util`. Their tests moved with them.

## Shell

The app keeps a screen stack: test, result, settings, account, leaderboards.
Opening a screen already on the stack unwinds to it. Ctrl+C always quits.
Screens receive keys first; esc goes back and ctrl+t/s/a/l open screens. Header
and key hints fit 80 columns.

## Storage and config

Config, cache and data live under the XDG base directories (`~/.config/oxytype`,
`~/.cache/oxytype`, `~/.local/share/oxytype`); absolute `XDG_*` overrides apply on
every platform, otherwise Windows uses `AppData`. JSON writes go through a
temporary file and rename; credentials can use mode `0600` in user-only
directories.

`config.json` stores the full config. Loading applies web migration: legacy
values convert, invalid values reset to defaults and unreadable JSON is replaced.
Settings are validated against the web-supported schema before saving; removed
web features are rejected. Writes are serialized and flushed before exit.

## Themes

Built-in and custom palettes resolve from config to opaque RGB; translucent
colours composite onto the theme background. OpenTUI detects terminal colour
support, emitting exact RGB on truecolor terminals and the nearest xterm-256
colour otherwise. Settings switches themes with left/right during this stage.

## Assets

`bun run assets` copies `languages/english.json` (200 words) and
`quotes/english.json` from `frontend/static`; the generated copy is not
committed. The asset source serves core loader URLs from packaged assets, then
the cache directory. Missing assets raise a 404-style error, which core quote
loading treats as an empty collection. Stage F adds downloads.

## Verification

- TUI: 44 Bun tests — OpenTUI test-renderer navigation, quit, 80-column layout,
  reactive config, theme switching/persistence, storage, paths, colours and
  offline core language/quote loading with network disabled.
- PTY smoke on Bun 1.4.2: first run renders, creates `config.json` and exits 0
  on Ctrl+C. `COLORTERM=truecolor` output uses RGB SGR codes; `TERM=xterm-256color`
  alone uses indexed codes (serika dark: 236/178/241/252).
- Frontend: 1,718 tests (105 sanitize/migration tests moved to packages),
  lint/typecheck and production build. Packages: lint and tests. Root lint,
  formatting and lint-config checks pass.
