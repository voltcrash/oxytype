# Offline terminal typing

Stage E completes E1–E10 above the Stage D foundation. Run `vp run dev-tui`.
Controls and package layout: [tui/README.md](../tui/README.md).

## Engine and rendering

The TUI owns one shared `TestSession`, asynchronous key ordering and a 50 ms
scheduler. Timestamps are captured when keys arrive; scheduling drives the core's
anchored timer and pace advancement. Generation and completion remain in the
core. A frozen test config records the effective language and active effects;
missing offline languages fall back to bundled English without overwriting the
preference. Word funboxes are explicitly unavailable until Stage G.

Letter states cover correct/incorrect/extra/untyped text, blind/hide-extra,
flipped/colorful colours and committed-word errors. Words wrap at boundaries or
between characters for long words, accounting for wide terminal characters.
The viewport follows the active line and reflows on resize. `showAllLines` uses
a scrolling viewport. The user caret is a native terminal cursor; pace is a
separate cell marker driven by shared advancement/correction rules.

OpenTUI 0.5's Solid `content` prop stringifies styled text. Component-owned refs
write colour chunks directly and paint the cursor after layout. No browser DOM
or frontend rendering is introduced. Approximations are listed in
[MISSING.md](../tui/MISSING.md).

## Test lifecycle

Time, words, quote, zen and custom modes load from bundled/cached sources through
the shared loaders. Ongoing tests replenish their word buffer; finite tests
remove the final separator. Custom supports word/time/section limits using the
shared default text, pending the Stage G editor.

Raw terminal keys record actual press times with `NoCode`; releases are recorded
when Kitty reports them. Missing releases retain core zero-duration placeholders
instead of estimated holds. Backspace, word deletion, confidence, freedom,
difficulty and stop-on-error use core decisions. Paste is blocked.

Restart closes abandoned tests for incomplete-time accounting. Configured quick
restart respects long-test protection and literal tabs/newlines. Repeat keeps
the current words/quote and is excluded from saving. F8 finishes zen or bails out
of other modes. Screen navigation and teardown stop test scheduling.

Live speed/accuracy/burst and progress use shared display helpers. Results show
speed, raw, accuracy, consistency, character counts, duration and test type.
WPM/raw/error block charts share a speed scale, bucket long histories into
columns and retain error peaks. Charts require at least 22 terminal rows.

## Local data

Valid TUI results save to the XDG data directory's `history.json` when
`resultSaving` is enabled. Entries include core result data and cumulative raw
history. Writes are serialized and atomic; save failures are visible. Invalid
stored entries are skipped individually. Ctrl+O opens paginated history.

PB, average of the latest ten, daily best and last pace filter local history by
mode/amount, language, punctuation, numbers, difficulty, lazy mode and funboxes.
Custom pace uses the configured WPM. Tagged PB pace awaits tags in Stage G.
Local storage is independent of the Stage F authentication/upload queue.

## Verification

- 84 Bun tests across 20 files: models/layout, themed renderer/cursors, session
  input and releases, all modes/custom limits, restarts/repeats, word refill,
  charts, durable history/save errors, local pace, and complete screen flows.
  Global preloaded cleanup disposes renderers/roots and temporary directories
  after every test, including files that reuse cached helper modules.
- Recorded web time-15 parity: all 15 live WPM/raw/accuracy ticks plus final
  WPM/raw/accuracy, characters, duration, consistency and chart data match.
- `python3 tui/scripts/smoke-pty.py`: real 80x24 CLI, raw input, custom ten-word
  test with 100% accuracy, saved history read after cold startup, RGB/cursor
  output and Ctrl+C exit 0. Automated transport evidence; human timing calibration
  remains outside this smoke.
- 486 package tests (262 core), 1,697 frontend tests, oxlint lint/typecheck,
  formatting, TUI/frontend circular-dependency checks and frontend build pass.

Shared helper extractions preserve web behaviour. Stages F/G add account/API,
downloads, complete settings, custom text editing and remaining parity screens.
