# Oxytype in the terminal

The terminal client uses the same account and backend as the website. Results,
personal bests, stats, streaks and leaderboards are partitioned into **TUI** and
**web**. English typing works offline without an account.

## Install and start

Requires stable **Bun 1.3.0+** on PATH and an interactive terminal of at least
**80 columns × 20 rows**. Use 80×24 or larger for result charts. Truecolor is
preferred; OpenTUI can downsample themes to 256 colors. Node does not run the
terminal renderer.

After the Stage H npm release is published:

```sh
bunx @voltcrash/oxytype
bunx @voltcrash/oxytype --words 25 --punctuation
bunx @voltcrash/oxytype --time 30 --language french
```

For a persistent installation:

```sh
bun add --global @voltcrash/oxytype
oxytype --help
oxytype --version
```

npm installation also works (`npm install --global @voltcrash/oxytype`), with
Bun still required to run it. Keep optional dependencies enabled: OpenTUI's
platform-specific native renderer is an optional npm dependency. macOS, Linux
and Windows binaries come from OpenTUI; Stage H verifies macOS locally and
Linux in CI. Windows is not covered by the Unix PTY smoke.

## CLI

| Command / flag | Behavior |
| --- | --- |
| No command | Start interactive typing |
| `login` | Print device URL/code, open browser, wait for approval, save credentials and pull server config |
| `logout` | Revoke the session and remove local credentials; a failed revocation retains credentials for retry |
| `-h`, `--help` | Print usage without opening the renderer or writing user data |
| `-v`, `--version` | Print package version without opening the renderer or writing user data |
| `--debug` | Include request method/status/timing and startup diagnostics in local logs |
| `--mode time\|words\|quote\|zen\|custom` | Select mode |
| `--time SECONDS` | Infer time mode; `0` is unlimited |
| `--words COUNT` | Infer words mode; `0` is unlimited |
| `--language NAME` | Shared language identifier, e.g. `english`, `french`, `english_1k` |
| `--theme NAME` | Built-in theme identifier, e.g. `serika_dark` |
| `--quote-length 0\|1\|2\|3` | Infer quote mode; short/medium/long/thicc |
| `--punctuation`, `--numbers` | Enable the respective option |

Counts/durations must be nonnegative integers. Conflicting mode/amount flags,
unknown arguments, invalid language/theme identifiers and test flags with
`login`/`logout` fail before opening a session. Exit codes: `0` success,
`1` runtime/auth/storage failure, `2` usage/non-interactive play, `130` cancelled
CLI auth. Ctrl+C in interactive play saves pending data and quits normally.

Test flags **update saved settings**. Before applying explicit flags, the client
checks any existing session and pulls server config. Without flags, it starts
immediately and checks the session in the background. Ordinary
settings changes continue syncing to the server. A new login uses the server
configuration. The palette can change every applicable setting without flags.

## Controls

| Key | Action |
| --- | --- |
| Ctrl+P / Ctrl+K | Searchable command palette |
| Ctrl+T / Ctrl+S / Ctrl+A / Ctrl+L / Ctrl+O | Test / settings / account / leaderboards / history |
| Esc | Screen back; configured quick-restart behavior applies during typing |
| Ctrl+C | Save pending writes, restore terminal and quit |
| F2 / F3 / F4 | Cycle mode / punctuation / numbers |
| F5 / F6 / F9 | Change amount / custom limit kind |
| Ctrl+R / F7 / F8 | Restart / repeat / finish zen or unlimited test |
| Enter on result | Next test |
| `r` on result | Replay latest test |

Screen footers show local controls. Arrow keys select rows; Enter activates or
edits. Settings support section switching, `/` search, reset and config
import/export. The custom editor accepts multiline bracketed paste; paste is
disabled during tests. Legacy terminals may not distinguish modified Enter/Esc;
use Ctrl+R/F7/F8 when needed.

The palette opens tags, presets, profiles, quote search/favorites, saved custom
texts, challenges, funboxes, practice and announcements. Captcha-dependent
signup, reports and quote submissions open browser forms. Replay and learned
weak spots last for the current process.

## Account and offline use

```sh
oxytype login
oxytype logout
```

The same device flow is available through Ctrl+A. Approve the displayed code
in a browser signed into your account. A missing browser launcher leaves the
link/code available for manual approval. Ctrl+C cancels one-shot login.

Guest results remain local. Authenticated online results upload as TUI tests.
Failed/offline uploads queue for their original account and API origin.
Reconnect uploads them as offline history/stats, without PBs, XP or rankings.
Uploads older than 30 days are dropped; their local history stays available.

English 200, English quotes and QWERTY ship inside the package. Other languages,
quotes, layouts and challenge scripts download on demand into a versioned
cache. Download once while online to use them offline. An unavailable language
falls back to English with a notice and retains the saved language preference.

Web account/profile/leaderboard pages provide the matching TUI/web selector.
Terminal limitations and web-only features are audited in
[MISSING.md](../tui/MISSING.md). Screen details: [TUI_SCREENS.md](TUI_SCREENS.md).

## Files and diagnostics

| Directory | Default on Linux/macOS | Contents |
| --- | --- | --- |
| Config | `~/.config/oxytype` | `config.json`, `network.json` |
| Cache | `~/.cache/oxytype` | Versioned downloaded assets |
| Data | `~/.local/share/oxytype` | History, upload queue, credentials, texts, tags, favorites, logs |

Absolute `XDG_CONFIG_HOME`, `XDG_CACHE_HOME` and `XDG_DATA_HOME` override the
base directories; the client adds `oxytype`. Relative values are ignored.
On Windows defaults use `%APPDATA%/oxytype` for config and
`%LOCALAPPDATA%/oxytype/{cache,data}`.

`network.json` accepts `apiUrl`, `assetUrl`, `timeoutMs`. Environment overrides:
`OXYTYPE_API_URL`, `OXYTYPE_ASSET_URL`, `OXYTYPE_TIMEOUT_MS`. Defaults point to the
official site. Credentials are bound to the API origin, with Unix permissions
`0600`; changing the API URL does not forward the previous server's bearer.

`oxytype.log` contains local JSON-line startup/shutdown/error records. `--debug`
adds request method, status and elapsed time. Logs omit typed text, tokens,
device codes, request/response bodies, URLs and error messages. Errors retain
their type, filesystem code and HTTP status when available. Logs rotate at
1 MiB to one `oxytype.log.1` backup; both files use Unix permissions `0600`.
Logging failure reports once and does not prevent offline play. Nothing is
sent to a remote error-reporting service.

If startup fails, the CLI prints the reason and diagnostic path. For bug reports,
include `--version`, Bun version, OS, terminal, reproduction steps and relevant
log records. If the screen looks corrupted, resize to 80×20 or larger and retry
in a truecolor terminal. If native renderer loading fails, reinstall with
optional dependencies enabled and a supported Bun release.

## Development and release

```sh
vp install
vp run dev-tui
vp run lint-tui
vp run test-tui
vp run build-tui
vp run --filter @voltcrash/oxytype package-check
```

TUI tests use Bun/OpenTUI, including checked-in screen snapshots. To run one
file, use `bun test __tests__/screen-snapshots.test.tsx` from `tui/`. Intentional
snapshot changes use `-u` and require reviewing the generated frames.
Typecheck uses `vp lint --type-aware --type-check --format agent`.

The build produces **`tui/dist/npm`**, an isolated publishable package with a
Bun bin entry, compiled Solid UI/shared code, source maps, offline assets,
GPL license and bundled dependency notices. Its only direct runtime dependency
is pinned OpenTUI core. The source workspace manifest remains private to prevent
publishing source files and `workspace:*` dependencies accidentally.

`package-check` packs the actual whitelist, installs the tarball outside the
repo without install scripts, verifies CLI flags, bunx, device login/logout and logging, then runs a
raw 80×24 PTY test with result persistence and cold history reopening. CI repeats
this on Linux. Asset changes also trigger terminal CI.

The manual [Terminal npm release workflow](../.github/workflows/tui-release.yml)
runs only from `main`, in the `npm` environment. It checks lint/tests, builds and
smokes the package, then publishes it publicly with provenance. An empty version
uses today's UTC date; production `v26.10.04` normalizes to npm `26.10.4`.
Prereleases such as `26.10.9-rc.1` require the `next` channel. Repeating the same
commit/version skips publication; a different commit at that version fails.
Retries do not change dist-tags. Production website deployment stays independent.

Maintainer setup: create the npm package under the `@voltcrash` scope and
configure its GitHub trusted publisher for owner `voltcrash`, repo `oxytype`,
workflow `tui-release.yml`, environment `npm`. OIDC requires npm 11.5.1+ on the
runner. For the first publication, use a maintainer's authenticated npm CLI or
an `NPM_TOKEN` secret in the `npm` environment; the workflow permits that token
fallback. After trusted publishing works, remove the bootstrap token. Follow
[npm's trusted-publisher instructions](https://docs.npmjs.com/trusted-publishers/).
