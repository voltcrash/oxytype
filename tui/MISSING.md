# Terminal feature audit

Stage H audit of the web pages, result controls, command lists, settings,
popups and funbox catalogue. `ported` means the terminal provides the behavior;
`approximated` means the behavior or presentation differs; `missing` means use
the web client. Browser handoffs are approximations requiring a browser.

## Ported features

| Web feature family | Status | Terminal implementation / scope |
| --- | --- | --- |
| Time, words, quote, zen and custom modes | ported | Shared generation, input, timing, completion and validation; punctuation, numbers, difficulty, confidence, freedom, stop-on-error, limits and lazy mode |
| Restart, repeat, bail out and practice | ported | Configured quick restart, explicit keys, missed/slow/pair practice, shared weak-spot learning for this process |
| Language, quote lengths and special sources | ported | Bundled English; versioned downloads and offline cache; favorites, British English and word transforms; source limitations below |
| Live speed, accuracy, burst and progress | ported | Shared tick values, speed units, decimal settings, hide/flash/blind rules; presentation limitations below |
| Result metrics, local persistence and server upload | ported | WPM/raw/accuracy/consistency/chars/time/mode, validity, PB/upload feedback and separate TUI stats; detailed web-only controls below |
| Offline tests and delayed uploads | ported | Durable account-bound queue; history/stats only, no PB/XP/leaderboard; uploads expire at 30 days, local history retained |
| Command palette and navigation | ported | Searchable applicable web commands, nested/flat lists, input and confirmations; terminal hotkeys below |
| Behavior, input, caret, appearance and visibility settings | ported | Shared schema/rules/defaults, local persistence, server sync, search and per-setting reset; unsupported rendering/input settings labelled web only |
| Config reset/import/export | ported | Confirmation, JSON/file imports, file exports and shared migrations |
| Built-in themes, favorites and active custom colors | ported | Shared palettes, favorite/light/dark rotation, color editor; alpha/cloud/automatic limitations below |
| Account login/session/logout | ported | Device consent, bearer auth, secure credentials, expiry/reconnect and revocation; browser owns consent and account administration |
| Profile search, account/profile stats and PBs | ported | Username lookup, TUI/web selection, text stats and paginated time/words PBs; rich views below |
| Result history, filters and details | ported | Local/TUI/web history; direct filters, selected-result metrics and remote WPM sparkline; mutations/exports below |
| Tags and presets | ported | CRUD, active tags, shared preset groups and apply; tag PB tables below |
| All-time, daily and weekly XP leaderboards | ported | TUI/web, language/mode, pagination, rank and profile navigation; presentation below |
| Quote search/favorites and custom texts | ported | ID/text/source search, typing selected quotes, favorites, multiline editor and saved texts; moderation/editor limitations below |
| Challenges, word funboxes and layout emulation | ported | Shared setup/verification, cached challenge scripts, shared word transforms and keyboard mapping; visual/font/protocol limitations below |
| Replay and announcements | ported | Latest-test replay controls and public announcement screen; persistence/presentation limitations below |

## Gaps and approximations

| Feature | Status | Reason | Approximation |
| --- | --- | --- | --- |
| Text-to-speech | missing | Browser speech synthesis API | Evaluate external speech support later |
| Sounds | missing | Browser audio playback | Evaluate terminal bell or native audio later |
| Custom fonts | missing | Terminal controls its font | Use the user's terminal font |
| Background images | missing | Terminal image support varies | Theme colors |
| Screenshots | missing | Browser canvas/DOM capture | Terminal capture or text export later |
| Visual funboxes | approximated / missing | CSS, DOM and animation effects | `plus_zero`–`plus_three`, read-ahead and memory hide terminal cells. Other visual/animated funboxes (including mirror, upside-down, Simon Says, ASL and TTS) require the browser; selection shows a notice and results omit skipped effects |
| Memory funbox | approximated | Finite terminal viewport | Shared countdown formula and hidden cells; long prompts require scrolling or `showAllLines` during memorization |
| Backwards funbox | approximated | Terminal renderer uses logical left-to-right cells | Shared reversed-word transformation; CSS word order and reverse caret direction are unavailable |
| Translucent theme colours | approximated | Terminals have no alpha channel | Composited onto the theme background |
| Theme colours without truecolor | approximated | 256-colour terminals | OpenTUI downsamples to the nearest xterm-256 colour |
| Smooth and decorative carets | approximated | Terminal cursor styles and cell positions | Native line/block/underline; outline uses block, decorative shapes use line; smooth movement off |
| Typo hints below letters | approximated | Cell grid | Both inline and below hints replace the incorrect target letter |
| Separate word-error underline colour | approximated | Terminals underline using the foreground colour | Underlined committed words retain their letter colours |
| Timer/live-stat sizes and bars | approximated | Fixed terminal cells | Numeric text; shared flash visibility, speed-unit and blind-mode rules |
| Result chart interaction | approximated | Terminal text and limited columns | Block sparklines for WPM/raw/errors; bucket long series, preserve error peaks; hide charts below 22 rows |
| Raw terminal key holds | approximated | Legacy protocols omit key releases | Real press spacing; core zero-duration placeholders; record Kitty releases when available |
| Modified restart/finish keys | approximated | Legacy terminals may encode Shift+Enter/Esc like the plain key | Ctrl+R restart, F7 repeat and F8 finish alternatives |
| Online/tag PB pace | approximated | Pace queries use locally stored results | Matching local PB, tag PB, average, daily, last and custom pace; server PBs are displayed on account/profile screens but do not drive pace |
| Poetry/Wikipedia/polyglot sources | approximated | External services or language downloads may be unavailable | Shared source generators; downloaded assets cache, source failures show notices; a failed polyglot language is ignored |
| Browser launch on headless terminals | approximated | A local browser launcher may be unavailable | Always show the device URL/code; keep polling while the user approves in another browser |
| Bidirectional and joining-script shaping | approximated | Terminal cell order and shaping vary; the word renderer lays out logical characters | Downloaded languages retain their text; terminal handles glyph shaping, without a separate bidi layout engine |
| Opposite-shift validation and IME composition UI | missing | Legacy terminals omit physical shift sides and composition events | Normal Unicode text input; preferences remain synced for web |
| Layout emulation | approximated | Legacy terminal protocols omit physical key positions | Shared ANSI/ISO/matrix mapping; Kitty base codes when provided, otherwise assumes QWERTY host positions. Uncached layouts disable emulation for that test with a notice |
| Keymap styling, size and physical geometry | approximated | Fixed terminal cells | Text rows with static/react/next highlighting, legends and top-row controls; decorative key styles and browser size values are web only |
| Random custom/automatic themes and automatic light/dark switching | missing | Browser appearance detection/cloud theme selection is not available in the TUI | Built-in on/favorite/light/dark rotation, favorites and active custom colors work; these unsupported modes retain the configured theme |
| Cloud custom-theme CRUD | missing | Stage G edits the active custom palette, not account theme collections | Edit ten palette colors, import/export config, or manage saved cloud themes on web |
| Account charts, activity heatmap, badges and rich profile decoration | approximated / missing | Stage G displays text stats and paginated PBs | TUI/web stats, XP, streaks, biography and keyboard; no account graph/heatmap or image decoration |
| Result-filter presets and aggregate history graphs | missing | Stage G provides direct result filtering and details | JSON filters for mode, duration/count, language, difficulty, punctuation, numbers, PB, tag, funbox, offline and date bounds; local/TUI/web sources |
| Tag PB tables | missing | Tags screen focuses on CRUD and active selections | Tagged results and local tagged pace; account PBs remain available |
| Profile editing, inbox/rewards and account deletion | missing | Outside Stage G profile/PB viewing scope | Use the existing browser account/settings pages |
| Leaderboard badges, period countdowns and charts | approximated | Text table UI | All-time/daily/weekly-XP, language, mode, client, pagination, rank and public-profile navigation |
| Quote ratings and moderation tools | missing | Stage G covers search/favorites and report/submit handoffs | Search by ID/text/source, type selected quote, favorite; ratings/approval on web |
| Custom editor visual selection, undo and generator/filter dialogs | missing | The terminal editor is a text field | Multiline paste, arrow/home/end editing, custom limits, pipe delimiter and saved text CRUD; no selection/undo or graphical word generator |
| Font-dependent challenges | missing | Terminal controls glyph fonts | Wingdings challenge is rejected with a browser notice; other challenges use shared setup/verification and cached scripts |
| PSAs/banner dismissal persistence | approximated | Announcements are shown on a dedicated screen | Public API, severity/sticky labels, date placeholders, scrolling and retry; no automatic banners or persisted dismissal |
| Captcha signup/reports/quote submission | browser handoff | Existing browser forms own captcha | Palette actions retain the URL for manual copy; links preserve quote language/ID or username through browser login, then open the form |
| Historical replay and replay sound/animation | approximated / missing | Saved history stores result metrics without raw event logs | Replay the latest in-memory test, including corrections/regressions, with pause, seek and speed controls; no replay after process exit |
| Web palette hotkey | approximated | OS/terminal shortcuts vary | Ctrl+P/Ctrl+K open the terminal palette; `commandPaletteHotkey` stays synced for web |
| Result word history, per-key timing and detailed diagnostics | missing | Result screen provides summary metrics and sparklines | Latest-test replay and practice commands; inspect rich word/key breakdowns on web |
| Result crown, daily rank/reward panels and quote action buttons | approximated | Compact terminal result screen | Upload/PB text; leaderboards, quotes and browser handoffs live on separate screens |
| History deletion, retagging, CSV export and PB reset | missing | History screen is read-only; tag CRUD does not retag saved results | Use web account controls; local `history.json` retains full metrics |
| Share test settings/results and screenshot watermark | missing | Browser share URLs/canvas controls have no terminal equivalent | Config file export; use web share/screenshot controls |
| OAuth/password/passkey administration and API keys | missing | Terminal uses device authorization | Manage providers, passwords, passkeys and API keys in browser account settings |
| Caps/Num Lock, browser focus/fullscreen and mouse controls | approximated / missing | Legacy terminal protocols omit lock state; most screens use keyboard controls | Terminal focus and window controls; clickable mode selectors, no lock-state warnings |
| Notification history and reward claims | missing | Notifications expire within this process | Dedicated announcement screen; browser inbox/reward controls |
| About, release history, legal and support pages | approximated | Informational browser pages | `--help`, `--version`, packaged README and documentation; website for legal/support/release history |
| PWA installation, service-worker cache and browser dev overlays | missing | Browser-only application lifecycle | npm installation, Bun runtime, XDG asset cache and local debug logs |
| Repeated-test pace | missing | Terminal pace uses the selected local PB/average/custom source | `repeatedPace` stays synced for web; F7 repeats words without reproducing the previous keystroke pace |
| Burst heatmap and word-history display toggle | missing | Rich word/key result display is not ported | `burstHeatmap` and `alwaysShowWordsHistory` labelled web only; metrics/replay/practice remain available |
| Web display toggles and mascot | missing | Browser-specific hints/notices and decorative mascot | `showKeyTips`, `showOutOfFocusWarning`, `showTestModesNotice`, `capsLockWarning`, `showAverage`, `showPb` and `monkey` labelled web only; terminal key hints remain visible |
| Typed-effect fade and line/tape animation | approximated | Fixed cells without CSS transitions | Fade hides typed cells; shared visibility/highlight rules and discrete line/tape movement |
