# SolidJS Migration Plan

Goal: remove all legacy vanilla-DOM UI from `frontend/`. All markup rendered by Solid; `index.html` reduced to shell + single mount.

- Branch: `refactor/solid-migration` (one branch, one PR, many small commits)
- This file = source of truth. Agents update checklist in same commit as the work.

---

## 0. Agent protocol (read first)

1. `git checkout refactor/solid-migration && git pull`. Never branch off it; never rebase shared history.
2. Pick **first unchecked task** whose deps are all `[x]`. Mark it `[~] (in progress)` only if working in parallel with other agents; otherwise just do it.
3. One task = one commit (big tasks may be split into `a/b/c` sub-commits, each green).
4. Before each commit, all must pass:
   ```sh
   cd frontend
   pnpm oxlint --type-aware --type-check --format agent
   pnpm vitest run                # or single file: pnpm vitest run path/to/test.ts
   pnpm build
   pnpm knip                      # from repo root; no new unused exports/files
   ```
5. Manual smoke check via `pnpm dev-fe` for anything touching the test page (type a timed + words + quote test, restart, finish, view result).
6. Commit msg: `refactor(<scope>): <lowercase subject>` (commitlint, ≤100 chars header). Include `Plan: <task id>` in body.
7. Tick box in this file (`[x]`) + add short note if anything deviated.
8. If blocked/unsure: add note under task `> BLOCKED: …` and move to next independent task.

## 1. Conventions (from CLAUDE.md + existing code)

- New components: `.tsx`, in `src/ts/components/...` mirroring existing layout (`pages/test/`, `modals/`, `popups/`, `layout/`).
- Styling: Tailwind + `class` + `cn` (`utils/cn.ts`). No `classList`. Only Tailwind-config colors. Delete matching SCSS when a component fully replaces it.
- Icons: `Fa` component (`components/common/Fa.tsx`), never `<i class="fas ...">` in new code.
- Modals: use `components/common/AnimatedModal.tsx` + register id in `states/modals.ts` `ModalId` + `Modals.tsx`. Open with `showModal(id)`.
- Charts: `components/common/ChartJs.tsx`.
- Tooltips: `components/common/Balloon.tsx`.
- State: Solid signals/stores in `src/ts/states/*.ts`. Legacy code reads/writes signals; components react. Pattern: move state to signal first, then swap rendering (see commits `e113dff1c`, `476fe5e07`, `1875f9a9d`).
- Mounting during migration: add `<mount data-component="x">` in HTML + entry in `components/mount.tsx`. Phase 5 removes this mechanism.
- Tests: component tests under `frontend/__tests__/components/...` using `@solidjs/testing-library` (see existing). Add test for any non-trivial logic moved.
- Keep behavior identical. No feature changes, no visual redesign. Visual diffs must be intentional + noted.
- Keep element ids/classes that are referenced by themes/CSS/funbox CSS (`static/funbox/*.css`, `static/themes/*.css`) or by user custom CSS where practical (e.g. `#words`, `.word`, `letter`, `#caret`, `#result`, `.pageTest`). grep `static/` before renaming.

## 2. Allowed imperative-DOM exceptions (end state)

These may remain imperative but must live inside Solid components (via `ref`/`onMount`), not global `qs` lookups:

- `document.documentElement` / `<head>` manipulation (theme vars, fonts, favicon, funbox CSS link).
- Canvas (Chart.js), screenshot capture (`html2canvas`-style).
- **Word/letter rendering hot path** (`test-ui.ts` `updateWordLetters`, `scrollTape`, caret positioning) — see decision D1.
- `noscript` + `#nocss` fallback in `html/warnings.html` (must work without JS/CSS).

## 3. Inventory (legacy UI remaining)

| Area | Files | LOC |
|---|---|---|
| Test page words/input/caret | `test/test-ui.ts`, `elements/caret.ts`, `test/caret.ts`, `test/pace-caret.ts`, `test/break-joining.ts`, `test/focus.ts`, `test/layout-emulator.ts`, `html/pages/test.html` | ~3.2k |
| Result screen | `test/result.ts`, `controllers/chart-controller.ts`, `elements/result-word-highlight.ts`, `test/replay-ui.ts`, `test/test-screenshot.ts`, `test/pb-crown.ts`, `html/pages/test-result.html` | ~3.3k |
| Test logic (DOM bits only) | `test/test-logic.ts`, `test/funbox/funbox*.ts`, `event-handlers/test.ts`, `event-handlers/global.ts` | DOM calls only |
| Commandline | `commandline/commandline.ts`, `commandline/lists*.ts`, `elements/input-validation.ts`, `html/popups.html#commandLine` | ~1.5k |
| Legacy modals/popups | `modals/practise-words.ts`, `utils/animated-modal.ts`, `html/popups.html` | ~680 |
| Small elements | `elements/test-init-failed.ts`, `test/funbox/memory-funbox-timer.ts`, `layoutfluid-funbox-timer.ts`, `elements/monkey-power.ts`, `elements/no-css.ts`, `pages/loading.ts`, `html/pages/loading.html` | ~500 |
| Page/router shell | `controllers/page-controller.ts`, `controllers/route-controller.ts`, `pages/page.ts`, `pages/test.ts`, `index.html`, `legacy-states/*`, `ui.ts`, `ready.ts` | ~1.2k |
| DOM utils | `utils/dom.ts` (`qs`, `ElementWithUtils`), `utils/skeleton.ts`, `hooks/useRefWithUtils.ts`, `utils/misc.ts` DOM helpers | ~1.3k |
| Possibly dead | `elements/result-batches.ts`, `elements/input-indicator.ts`, `elements/character-counter.ts`, `utils/discord-avatar.ts`, `utils/sorted-table.ts`, `utils/tag-builder.ts` | verify w/ knip |

---

## 4. Tasks

Legend: `[ ]` todo, `[~]` in progress, `[x]` done. `deps:` = must be done first.

### Phase 0 — Prep

- [x] **P0.1** Create branch + this plan.
- [x] **P0.2** Dead code sweep. Run `pnpm knip`; grep each "possibly dead" file (incl. relative imports `./x`). Delete unused ones + their SCSS. Commit: `refactor: remove unused legacy dom modules`.
  > Note: deleted `result-batches`, `character-counter`, `discord-avatar`, `sorted-table`, `tag-builder` (+spec; only test used it), `.textareaWithCounter`/`.headerSorted`/`td.sortable` SCSS, now-unused `createElementWithUtils`. Kept `input-indicator` (used by `input-validation` → P2.2). Root `pnpm knip` crashes loading `storybook/.storybook/main.ts` (pre-existing); use `pnpm knip --workspace frontend`. Its other unused files (`ignored-keys`, `async-modules`, `debug`, `tanstack-table.d.ts`, `firebase-config-example`) are not legacy DOM, left alone.
- [x] **P0.3** Add baseline tests guarding test-page behavior that later phases touch: word element structure (`.word > letter` classes: `correct`/`incorrect`/`extra`), result stats computation outputs. Pure-logic tests only (no snapshot of whole DOM). Commit: `test: add baseline tests for test ui and result`.
  > Note: `__tests__/test/test-ui.spec.ts` (letter classes via `addWord`/`updateWordLetters`/`toggleResultWords`, real happy-dom fixture) + `__tests__/test/result.spec.ts` (`update()` outputs recorded per `qs` selector: wpm/raw/acc/consistency/time/key/testType/info/source text + aria-labels, crown). Both go through public API since builders aren't exported; P3.x/P4.x must port assertions, not delete them.

### Phase 1 — Small leaf elements (independent; parallelizable)

- [x] **P1.1** Loading page → `components/pages/LoadingPage.tsx`. Move bar/spinner/error/text to signals in `states/loading-page.ts` (API kept: `updateBar`, `updateText`, `showSpinner`, `showError`, `showBar`). Remove `html/pages/loading.html`, markup in `pages/loading.ts` (keep `Page` object until P5). Drop `loading.scss` parts replaced.
  > Note: `pages/loading.ts` re-exports setters from `states/loading-page.ts`. `#pageLoading` wrapper stays in `index.html` (Skeleton + `Page.element`), layout moved to Tailwind there. Bar fill animated via `Anime` (`respectReducedMotion={false}` to match legacy). Text rendered as text, not HTML (all callers pass plain text).
- [x] **P1.2** Test init failed → `components/pages/test/TestInitFailed.tsx`, signal `testInitError` in `states/test.ts`. Replace `elements/test-init-failed.ts` callers with setters. Remove `#testInitFailed` from `test.html`.
  > Note: signal is `getTestInitError`/`setTestInitError` (`{ message } | null`). `#typingTest` hide stays in `test-logic.ts` `init()` (restart already re-shows it). Mount uses `class="contents"`, so component sets `col-[content]` itself. Empty error line no longer renders when there's no error (legacy left an empty `mt-8` div).
- [x] **P1.3** Memory + layoutfluid timers → `components/pages/test/FunboxTimer.tsx` (one component, two instances or mode prop). Signals for visible/text. Remove `#memoryTimer`, `#layoutfluidTimer` from HTML; delete timer modules' DOM code.
  > Note: signals in `states/funbox-timers.ts` (text + `"shown"|"hidden"|"instant"`; instant = legacy `instantHide`). `FunboxTimers` renders both ids via one `funboxtimers` mount. The pre-existing memory countdown reset was preserved during migration, then fixed in a follow-up: removed the duplicate reset from `TestUI.onTestRestart`, which ran after the memory funbox `restart()` started the timer. Cleanup remains in funbox activation, clearing, and the memory start hook.
  > Follow-up validation: 9 countdown/lifecycle regressions and all 1,544 frontend tests pass; type-aware oxlint and production build pass. Browser checked countdown/expiry, early typing, restart, and timed/words/quote results. Knip findings match the existing `main` baseline.
- [x] **P1.4** Restart button + test loading spinner (`#restartTestButton`, `.pageTest > .loading`) → `RestartTestButton.tsx`, `TestLoading.tsx`. Keep id `restartTestButton` (focus/tab logic in `input/hotkeys/quickrestart.ts`, `event-handlers/test.ts`).
  > Note: added optional `id` prop to `Button`. Focus-mode hide reads `getFocus()` (same frame as `main.focus`). Spinner driven by new `isResultLoading` signal (`states/test.ts`), set in `finish()`, cleared in `result.ts`. `.loading` class dropped (no theme/funbox refs). Mobile `display:block` override kept via `pointer-coarse:max-[778px]:block!`.
- [x] **P1.5** Monkey power (`elements/monkey-power.ts`) → `components/pages/test/MonkeyPower.tsx` (particles/screen shake). Canvas stays imperative inside component.
  > Note: logic moved verbatim into `MonkeyPower.tsx` (exports `addPower`/`reset`, like `FpsCounter.tsx`). Canvas mounted at `<body>` level (`monkeypower` mount at end of `index.html`) so it shakes with body like legacy. Resize listener via `onMount`/`onCleanup`. `#caret` still looked up with `qsr` in `onMount` until P4.4. `init()` call removed from `ready.ts`.
- [x] **P1.6** Practise words modal → `components/modals/PractiseWordsModal.tsx` (`ModalId` `PractiseWords`). Update callers `commandline/lists/result-screen.ts`, `event-handlers/test.ts`. Remove `<dialog id="practiseWordsModal">`, `modals/practise-words.ts` (logic stays in `test/practise-words.ts`).
  > Note: commandline "custom..." command drops `opensModal` + legacy `modalChain` and just calls `showModal("PractiseWords")`, same as other Solid modals opened from commandline (e.g. QuoteSearch); Escape still lands back on commandline. Modal uses standard `AnimatedModal` look (`max-w-[400px]`). Dialog id is now `PractiseWordsModal` (no theme refs). `src/ts/modals/` dir is gone.
- [x] **P1.7** Retired: the video ad popup and its integration were removed from Oxytype.
- [x] **P1.8** Retired: advertising was removed from Oxytype, including containers, controllers, state, settings and styles.

### Phase 2 — Commandline (deps: none; parallel with P1)

- [x] **P2.1** Extract commandline state (open, input value, mode, subgroup stack, selected index, warning, checking) to `states/commandline.ts` signals/store. Legacy `commandline.ts` reads/writes store; no render changes. Tests for filtering/matching (`commandline/util.ts` already tested).
  > Note: matching moved to a pure helper with tests; DOM rendering stayed legacy. Root `pnpm knip` still fails loading Storybook config; scoped exports/types passes, and scoped unused-file/dependency findings match the P0.2 baseline. Build used ignored local Firebase configs and a captcha test key.
- [x] **P2.2** `components/modals/Commandline.tsx` rendering input, suggestions list (use `<For>`; virtualize only if current code limits count), warning, checking icon, input-validation (port `elements/input-validation.ts` to a hook or reuse `components/ui/form`). Register `Commandline` modal id (exists in `ModalId`). Keep keyboard nav + mouse hover behavior identical; keep `commandline.show()` API as thin wrapper → `showModal("Commandline", …)`.
  > Note: old dialog/SCSS remain until P2.3; controller still mirrors to the hidden dialog during this step. Theme preview swatches retain data-driven colors. Browser checked hotkey, filtering, navigation, hover, input validation, and Escape. Root Knip still fails on Storybook; scoped exports/types passes with only P0.2 baseline findings.
- [x] **P2.3** Remove `<dialog id="commandLine">`, `commandline.scss` → Tailwind, delete legacy render code. `commandline/lists/*.ts` data stays (not UI). Delete `utils/animated-modal.ts` if no users remain (also `commandline/types.ts` import).
  > Note: Solid `AnimatedModal` accepts a DOM id override to preserve `#commandLine` theme/custom CSS. Browser checked filtering, hover, keyboard navigation, input validation, and Escape after removing legacy markup. Root Knip still fails loading Storybook; scoped exports/types passes with only P0.2 baseline findings.

### Phase 3 — Result screen (deps: P0.3)

Order matters; each sub-task a commit. Container first, then pieces.

- [x] **P3.1** Result state: store `states/result.ts` holding computed result view model (stats, crown state, tags, quote info, daily lb rank, flags like `loginTip`, `retrySaving`). `test/result.ts#update` computes + sets store; still writes DOM. Tests for view-model builder.
  > Note: store `states/result.ts` (`resultState`), pure builders in `test/result-view-model.ts` (`buildResultStats`/`buildSpeedStats`/`buildCrown`, tested). Legacy DOM now rendered from store via `render*` fns in `result.ts`; `test-logic`/`QuoteRateModal`/edit-tags handler go through `Result.update{RetrySaving,SavedResultId,DailyLeaderboardRank,QuoteRating}` / `resultState` instead of DOM attrs. `pb-crown` `currentType` moved to store. Tags list re-rendered whole on edit (same markup minus hidden crown `<i>`). Dropped dead `.infoAndTags` toggle. Baseline spec loginTip assertion ported to `#result .loginTip` + store.
- [x] **P3.2** `components/pages/test/result/Result.tsx` shell mounted in place of `#result` wrapper; render stats groups (wpm, acc, raw, characters, consistency, time, test type, other, source) from store. Remove corresponding DOM writes + HTML.
  > Deviation: `#result` wrapper stays static HTML; only the two `.stats` blocks moved to `components/pages/test/result/ResultStats.tsx` (`resultstats` mount, `class="contents"`). Reason: `#wpmChart` (chart-controller) and chart legend/copy/replay buttons are bound at module import, before `mountComponents()`, so a Solid-owned wrapper would break them until P3.7-P3.12. Shell (`Result.tsx`) owns `#result` in P3.13. Crown, tags, daily lb and quote buttons markup is static JSX still driven by `result.ts`/`pb-crown.ts` (their SCSS kept for P3.3-P3.6); their import-time `.on` handlers now delegate via `.pageTest` `onChild`. Stats SCSS + media-query parts replaced by Tailwind; computed styles/rects diffed identical vs legacy at 1400/1000/800/700/400/320px. Test type/other/source rendered as text lines (no quote source contains HTML). Glarses hides stats via `resultState.noStress`.
- [x] **P3.3** Crown (`test/pb-crown.ts`, `showCrown/updateCrown/showErrorCrownIfNeeded`) → `ResultCrown.tsx`.
  > Note: `ResultCrown.tsx` renders from `resultState.crown` (fade-in via animejs on mount, removed instantly when hidden, like legacy show/hide). `test/pb-crown.ts` + crown SCSS deleted; states via CSS vars in Tailwind classes, keeps `crown` + type class for custom CSS. Computed styles identical vs legacy for all 5 types.
- [x] **P3.4** Tags group + edit button (`updateTagsAfterEdit`) → uses existing `EditResultTagsModal`.
  > Note: `ResultTags.tsx` renders `resultState.tags`; edit button opens `EditResultTagsModal` via JSX `onClick` (user-tags check uses `useTagsLiveQuery`, lint forbids `__nonReactive` in components). `updateTagsAfterEdit`/`updateSavedResultId` only set the store now. Also removed a leftover `.timeToday` DOM write missed in P3.2 (it overwrote Solid's text node with the same value). Styles diffed identical vs legacy.
- [x] **P3.5** Quote buttons (report/favorite/rate, `updateRateQuote`) → `ResultQuoteActions.tsx`.
  > Note: `ResultQuoteActions.tsx` renders from `resultState.quote`; favorite toggle + report/rate click handlers moved in from `result.ts`/`event-handlers/test.ts`. `updateRateQuote` is now internal to `result.ts` (store only); `QuoteRateModal` uses `updateQuoteRating`. Styles diffed identical vs legacy.
- [x] **P3.6** Daily leaderboard rank group.
  > Note: `ResultDailyLeaderboard.tsx` renders `resultState.dailyLeaderboardRank` (fade-in on show, unmounted when undefined instead of `.hidden`); click navigation moved from `event-handlers/test.ts`. Dropped the redundant inline `max-width: 13rem` (class already sets it). `#result .stats` SCSS is now fully gone.
- [x] **P3.7** Result chart: `chart-controller.ts` result chart → `ResultChart.tsx` using `ChartJs.tsx`; legend buttons (`scale`, `pbLine`, `tagPbLine`, `raw`, `burst`, `errors`) driven by config signals. Keep `toggleSmoothedBurst`, `toggleUserFakeChartData` globals. Hover-highlight integration with `result-word-highlight.ts` via callback prop.
  > Note: `ResultChart.tsx` (`resultchart` mount, `class="contents"`) renders `.chart` + legend (Tailwind) and `ChartJs` canvas `#wpmChart`; `onHighlightWords`/`onHoverChange` props wired to `result-word-highlight` in `mount.tsx`. Chart instance ref + `getResultChartDataset`/`getResultChartScale` in `states/result.ts`; legend state in `resultState.chartLegend`, set by `result.ts` (data/annotations/min-max logic unchanged); click → `toggleResultChartLegend`. `controllers/chart-controller.ts` deleted: Chart.js registration, defaults and font-family subscription moved to `ChartJs.tsx` (gained `id`/`class`/`onMouseEnter`/`onMouseLeave`); dead non-result `updateColors` branch dropped. Pre-existing quirks kept: on result show, legend is computed before pb/tag pb lines are added, so `tagPbLine` button stays hidden and pb/tag pb lines ignore their saved visibility until a legend button is clicked. Styles diffed vs legacy values.
- [x] **P3.8** Words history (`#resultWordsHistory`, `toggleResultWords`, `applyBurstHeatmap`, copy buttons, heatmap legend) → `ResultWordsHistory.tsx`. Word markup generation may reuse pure fn from `test-ui.ts` (extract to `test/word-markup.ts` first).
  > Note: pure builders `buildWordLetters`/`buildWordsHistory` in `test/word-markup.ts` (P3 only; `test-ui.ts` live word markup untouched until P4.6), heatmap math in `result-view-model.ts` (`buildBurstHeatmap`/`getBurstHeatmapWordColor`). Store `resultState.wordsHistory` (items/visible/slideDuration/rtl/joining); `toggleResultWords` moved to `result.ts` (now sync). Heatmap is reactive to `burstHeatmap`/`typingSpeedUnit`/theme instead of re-applied on config events. Hover tooltip rendered by Solid as text (legacy escaped `<`/`>` as `&lt`/`&gt` without `;`). Copy/heatmap buttons moved in from `test-ui.ts`. Kept: `word`/`letter` classes + `input`/`burst` attrs (read by `result-word-highlight`), `.word`/`.wordInputHighlight`/`noErrorBorder` SCSS (shared with `#words`/screenshot; `theme-controller` still toggles `noErrorBorder` imperatively). P0.3 `test-ui.spec` assertions ported to `word-markup.spec`/`ResultWordsHistory.spec`.
- [x] **P3.9** `result-word-highlight.ts` → hook `useResultWordHighlight` inside ResultWordsHistory/Chart.
  > Note: `hooks/useResultWordHighlight.tsx` returns `{ component, destroy }` (like `useSavedIndicator`), used by `ResultWordsHistory`; highlight containers/input words rendered via JSX from measured line data (position math verbatim). Chart → history via `resultWordHighlightEvent` (`createEvent` in `states/result.ts`), dispatched from `ResultChart` props in `mount.tsx` until P3.13. Destroy triggers: heatmap button, hook-owned `resize` listener, and new `wordsHistory.items` (replaces `test-ui` restart destroy; highlight only exists on the result screen). Toggle buffer timestamp now taken from `wordsHistory.visible` changes. Input word text rendered as text (legacy `&lt`/`&gt` entities counted toward the letter-count slice). Highlight SCSS → Tailwind, class names kept. `utils/misc.ts` `getBoundingRectOfElements` now only used by the hook (P6.2).
- [x] **P3.10** Replay (`test/replay-ui.ts`, `#resultReplay`) → `ResultReplay.tsx`. Replay playback timing logic stays in plain TS module; rendering via signals.
  > Note: `test/replay-ui.ts` → `test/replay.ts` (logic only: action derivation, timeouts, display logic now mutates `resultState.replay.words` via `produce`, `loadOldReplay` batched). `ResultReplay.tsx` (`resultreplay` mount) renders title/play button/stats/words; play button + letter click (`jumpToLetter`) are JSX handlers, button state = `resultState.replay.playback` (`start`/`playing`/`paused` → legacy aria-labels + `fa-play`/`fa-pause`). `#watchReplayButton` delegate stays in `replay.ts` until P3.11 (`toggleReplayDisplay` exported for it). RTL/joining flags moved from `wordsHistory` to top-level `resultState.rightToLeft`/`joiningScript` (shared by history + replay). Replay letters rendered as text (legacy `innerHTML`). Kept quirk: restart calls `pauseReplay`, so the label reads "Resume replay" on later results. Screenshot still hides/shows `#resultReplay` imperatively (P3.12); visibility source of truth is now `resultState.replay.visible`.
- [x] **P3.11** Bottom buttons (next, repeat, practise, history, replay, screenshot, retry saving) → `ResultButtons.tsx`. Hotkeys/tab order must match.
  > Note: `ResultButtons.tsx` (`resultbuttons` mount) renders retry saving (`<Show>` on `resultState.retrySaving`) + `.buttons` row; delegated `.pageTest` handlers moved from `test-logic.ts`, `result.ts`, `replay.ts`, `test-screenshot.ts`, `event-handlers/test.ts` into JSX `onClick`. Glarses hide of history/replay/screenshot now from `resultState.noStress`. Shift → download icon via component-owned `keydown`/`keyup` listeners (same result/page guard). Same ids, `text` class, labels, balloon attrs and DOM/tab order (Tab from `#result` → `#nextTestButton`, verified). Dropped never-styled `.loaded` class and the no-op `#showWordHistoryButton { opacity: 1 }`. `.buttons` + purple media query → Tailwind (`max-sm`); `#result .wrapper button` padding rule kept (shared). The obsolete video-ad button and its handlers have since been removed.
- [x] **P3.12** Screenshot (`test/test-screenshot.ts`): replace `qs` lookups with refs exposed from `Result.tsx` (e.g. `states/result.ts` holds element ref). `.ssWatermark` into JSX.
  > Deviation: no refs needed; result components hide themselves on `getIsScreenshotting()` (`.buttons`, word hover tooltip, highlight containers, replay via a `contents` wrapper since slideDown/Up own `#resultReplay` classes). `.loginTip` → `ResultLoginTip.tsx` (store `loginTip`, hidden while screenshotting), `.ssWatermark` → `ResultWatermark.tsx` (`getScreenshotWatermark` signal: date + user name + `UserFlags` icons instead of `getHtmlByUserFlags` HTML), both via `resultfooter` mount. Still `qs`: `#result` (`noBalloons`) + `#result .wrapper` (crop target) until the P3.13 shell, and `noscript`/`#nocss` (§2). Fixed quirk: legacy `revealReplay` never reset, so later screenshots re-showed a closed replay; replay visibility now just follows the store. Login tip after screenshot follows the store (legacy re-showed it for any logged-out user, even in glarses mode). Verified capture in browser (clipboard stubbed).
- [x] **P3.13** Delete `html/pages/test-result.html`, dead SCSS in `test.scss` (result section), dead exports in `result.ts`. `result.ts` should now be logic-only.
  > Note: `Result.tsx` shell (`result` mount in `test.html`) renders `#result` (static class: `result.ts`/`test-ui.ts` still show/hide/fade/focus it) with all result components; per-piece mounts removed from `mount.tsx`. `#result`/`.wrapper` refs in `states/result.ts` (`getResultElement`/`getResultWrapperElement`) replace the last `#result` lookups in `result.ts`, `test-ui.ts`, `test-screenshot.ts`. `#result` needs explicit `col-[full-width]` (the `contents` mount breaks `.content-grid > .full-width`). Wrapper grid, focus outline and `.bottom` → Tailwind; `#result .wrapper button` padding → `[:where(&)_button]:p-[1em_2em]` (zero specificity, so component utilities still win like before); blue/brown media-query wrapper overrides → `max-md:`. Only `#result.noBalloons` SCSS left. Glarses check mark is `<Show when={noStress}>` (fix: legacy prepended it and never removed it on later non-glarses results). Dropped dead `#watchVideoAdButton` show/hide (button is commented out). `result.ts` DOM access left: `#words` (P4) + body computed style. Browser-checked time/words/quote, restart (Tab→Enter), focus, 1280/800px layout, screenshot crop.

### Phase 4 — Test page core (deps: P1.2–P1.4, P3.13) — highest risk

Perf critical: per-keystroke work must not regress. Measure with `utils/profiler-mode.ts` / devtools before+after each commit; note numbers in commit body.

- [x] **P4.1** `components/pages/test/TestPage.tsx`: render full `.pageTest` structure (testconfig, wordsWrapper, textarea `#wordsInput`, `#paceCaret`, `#caret`, `#words`, keymap, monkey, live stats, result) as JSX; child Solid components rendered directly instead of via `mount` entries. Replace `html/pages/test.html` with `<mount data-component="testpage">`. Legacy code still finds elements by id → works unchanged.
  > Note: shell + textarea styles moved to Tailwind; ids/classes and textarea attributes retained. Required startup adaptation: test DOM caches/carets now initialize lazily, input/focus listeners bind at DOM-ready, and the mounted page ref replaces the temporary Page mount element. Words/caret/wrapper internals remain for P4.2–P4.7. Browser checked time/words/quote, restart, result tab order, commandline, focus, and 1280/800px layout. Root Knip still hits the documented Storybook error; scoped exports/types passes with only the P0.2 baseline findings.
- [x] **P4.2** Expose refs: `states/test-dom.ts` with `wordsEl`, `wordsWrapperEl`, `wordsInputEl`, `caretEl`, `paceCaretEl` set from `TestPage` refs. Replace `qs("#words")` etc. in `test-ui.ts`, `caret.ts`, `pace-caret.ts`, `focus.ts`, `input/input-element.ts`, `layout-emulator.ts`, `funbox-functions.ts`, `test-logic.ts`. No behavior change.
  > Note: TestPage supplies wrapped refs for words/wrapper/input/carets/typingTest; caches and selector animations replaced, including funbox timers and MonkeyPower. Config listeners defer DOM work until refs mount (fixes the P4.1 startup pace-caret race); restart applies the current config. Baseline DOM fixtures now supply refs. Focus/layout-emulator had no matching element lookups. Root Knip exception remains as documented.
- [x] **P4.3** Focus/blur (`test/focus.ts`, words blur) → driven by `testFocusState` signal + `cn` classes on TestPage (comment in `states/test.ts` says words blurred imperatively).
  > Note: P5 resolved ownership: shell focus and cursor visibility use signals; mouse listener belongs to App, words blur binds TestPage refs while preserving legacy classes. Kept initial cursor and >3px positive movement behavior; removed focus DOM caches and replaced blur SCSS. Added focus/class-preservation/lifecycle tests; full smoke/checks pass with the Knip baseline exception. Corrected profiled keystroke CPU median/p95: 0.7/1.2 → 0.7/1.2 ms (visible preview, settled watcher, 30 warmup + 300 samples); supersedes the unprofiled numbers in 5bc4d8db7.
- [x] **P4.4** Caret → `components/pages/test/Caret.tsx` owning element; `Caret` class keeps position math + animation, receives element via ref. Pace caret same.
  > Note: `Caret.tsx` owns both nodes and binds/cancels their animation controllers; math unchanged. Normal caret SCSS moved to Tailwind with style/id hooks retained; legacy debug outline remains in `caret.scss`. All 1,244 tests, typecheck/build and browser smoke pass; Knip retains the documented baseline exception. Profiled keystroke CPU median/p95: 1.9/3.1 → 1.0/1.5 ms (30 warmup + 300 inserts; host timing varies).
- [x] **P4.5** Words wrapper sizing (`updateWordsWrapperHeight`, `centerActiveLine`, `keepWordsInputInTheCenter`, `updateWordsInputPosition`) → reactive styles on TestPage from signals.
  > Note: wrapper height/input coordinates use signals and JSX styles; component-owned scrolling preserves viewport/force guards. Line-jump math stays in the allowed imperative word path. Added scroll/lifecycle tests; full checks/smoke pass with the documented Knip exception. Fixed-word profiled median/p95: 0.9/2.0 → 0.9/1.6 ms (30 warmup + 300 inserts).
- [x] **P4.6** Word rendering (D1 = A): keep imperative `updateWordLetters`/`addWord`/`scrollTape` inside a `Words.tsx` component's module; only lifecycle + container are Solid. Extract pure markup builders to `test/word-markup.ts` with tests. Do NOT convert to reactive `<For>` in this PR.
  > Note: `Words.tsx` owns the container, focus/config listeners and frame cleanup; `test-ui.ts` is a compatibility re-export. Imperative rendering/tape math kept under D1; initial/live markup builders extracted to `word-markup.ts` with tests, P0.3 assertions retained. Container SCSS → Tailwind; rich word styles remain for P4.9. Full checks/smoke pass with the documented Knip exception. Fixed-word profiled median/p95: 2.2/3.7 → 2.1/3.3 ms (30 warmup + 300 inserts).
- [x] **P4.7** Break joining / hints (`break-joining.ts`, `updateHintsPositionDebounced`, `setJoiningClass`) into Words component module.
  > Note: joining width/wrap/reset helpers now live in `Words.tsx`; hint lookups use its container ref. Added wrapped/unwrapped/return-to-word assertions. Full checks and time/words/quote/Arabic hints smoke pass with the documented Knip exception. Matched fixed-word median/p95: 0.8/1.5 → 0.9/1.9 ms; repeated host-loaded samples range up to 2.3/3.9 ms (30 warmup + 300 inserts). Positioning/joining math unchanged.
- [x] **P4.8** Remove remaining `qs`/`qsa` DOM calls from `test-logic.ts`, `funbox/*.ts` (funbox DOM effects → signals consumed by TestPage, e.g. classes on `#words`/body), `event-handlers/test.ts` (delegate listeners → JSX `onClick`).
  > Note: P5 ownership resolved: funbox classes, links, CRT scanline and words visibility use signals; TestPage owns input/window lifecycle and wrapper click. Removed global test listeners/inert ad delegate; kept body CSS precedence, sticky reduced-motion and memory-timer quirks. Full smoke/checks pass with the Knip baseline exception. Profiled keystroke CPU median/p95: 0.7/1.2 → 0.7/1.3 ms (visible preview, settled watcher, 30 warmup + 300 samples).
- [x] **P4.9** `test.scss` cleanup for converted pieces (keep selectors themes rely on).
  > Note: wrapper positioning/overflow/tape mask/letter-color variables and result screenshot tooltip hiding moved to Tailwind; removed corresponding `test.scss` sections. Word/letter/shared result-history/funbox selectors retained. Full checks and smoke pass with the documented Knip exception; mask/overflow/pseudo-element styles verified. Profiled median/p95: 1.7/3.3 → 2.4/3.9 ms under variable shared-host load; no keystroke logic changed.

### Phase 5 — App shell + routing (deps: P1.1, P1.8, P4.1)

- [x] **P5.1** `components/App.tsx`: render header, `<main>`, all pages, footer, overlays, modals, popups, theme, devtools, bartimerprogress. `index.html` body → `<load src="html/warnings.html" />`, `.customBackground`, `<div id="app">` mount, funbox css link, scripts. Replace `mountComponents()` with single `render(<App/>)`. Delete `components/mount.tsx`.
  > Note: one `App`/query-provider root replaces all mounts; body-level UI uses a Portal to retain layout/focus behavior. Page/Skeleton lookups are lazy until P5.2/P5.3. Shell SCSS moved to Tailwind, settings-highlight selectors updated to the preserved page id. Preview recovered in a fresh tab; full smoke and frontend checks pass with the documented Knip exception.
- [x] **P5.2** Page switching: `states/core.ts` already has `getActivePage`. Make pages render via `<Show>`/`<Switch>` on active page + existing `components/common/Page.tsx`; move page transition animation (`page-controller.ts`, `legacy-states/page-transition.ts`) into component. Keep `PageController.change()` API as a thin wrapper setting signal + running lifecycle hooks (`beforeShow` etc.).
  > Note: `AppPages` owns Show attachment, classes, refs and fades; controller retains lifecycle/loading orchestration via `states/page-transition.ts`. Component owners/test refs stay cached across navigation to preserve legacy input/caret bindings and page-local state; existing `Page` gates still own active-page content. Deleted unused Skeleton. Added transition/ref-retention tests; full smoke/frontend checks pass with the Knip baseline exception.
- [x] **P5.3** Router: `route-controller.ts` → keep own router (D2; no `@solidjs/router`); replace `[router-link]` delegated handler with `<A>`-like `Link` component; remove `pages/page.ts` `element: ElementWithUtils` field.
  > Note: internal anchors use `Link` (including Button, logo and result login); removed delegated clicks and `Page.element`. Custom router/guards/history and modified-click behavior retained; added Link/Button routing tests. Full smoke/frontend checks pass with the documented Knip baseline exception.
  > Follow-up (1 October 2026): D2 superseded. Solid Router now owns matching, native links and history; custom route controller/navigation event bus removed. Component-owned `NavigationRuntime` retains auth/loading, test guards and page lifecycles; URL replacements use the mounted router. Cached page owners/ref bindings and transition animations remain.
- [x] **P5.4** `legacy-states/*` → move to `states/` as signals (composition, connection, glarses-mode, page-transition, remember-lazy-mode, slow-timer). Delete `legacy-states/`.
  > Note: all six modules now use signals in `states/`; APIs, offline-banner debounce and lazy validated storage reads/writes preserved. Added reactivity/transition/slow-timer/persistence tests. Full frontend checks pass; root Knip retains the documented Storybook error, scoped findings match baseline.
- [x] **P5.5** `ui.ts` / `ready.ts` / `elements/no-css.ts` / `event-handlers/global.ts` DOM bits → App effects or `onMount`. `body.loading` class → App.

  > Note: `AppEffects` owns host-ref bindings, fonts, startup fade/readiness, resize/unload and service workers; `GlobalEvents` owns keyboard/error listeners with cleanup. `ui.ts` is a signal API; deleted ready/global/no-css modules and dev-indicator SCSS. No-CSS static/inline fallback retained per §2. Added startup, class preservation and listener-disposal tests; full smoke/frontend checks pass with the documented Knip baseline exception.

### Phase 6 — Utils + cleanup (deps: all above)

- [x] **P6.1** Remove `ElementWithUtils`, `qs`, `qsa`, `qsr` from `utils/dom.ts` (keep pure helpers if any). Delete `hooks/useRefWithUtils.ts` (replace with `hooks/useRef.ts`). Delete `utils/skeleton.ts`. Remove `qs/qsa/qsr` from `addToGlobal` in `index.ts`.
  > Progress P6.1a: common/modal/chart/header/banner/captcha/config/result refs use native nodes; slide animations retain layout classes and cleanup. Remaining word/caret/controller wrappers follow in P6.1b/c. Checks/smoke pass with the documented Knip baseline exception.
  > Progress P6.1b: word/caret/input/result refs now native; positioning/tape/joining math and empty-style clearing preserved. Added native caret assertions. Full frontend checks and smoke pass; Knip baseline exception remains.
  > Note P6.1c: deleted DOM wrappers/global selectors/useRefWithUtils and dead swapElements; kept DOM-ready lifecycle in dom-ready.ts. Native table/theme/calendar refs and scoped email-handler nodes replace remaining wrapper consumers. Standalone auth entry was missing from the inventory; markup/controller ownership remains for P6.3. Deleted obsolete delegated-wrapper tests; P0.3 word/result assertions retained. 1,254 tests, typecheck/build and smoke pass with the documented Knip exception.
- [x] **P6.2** Move remaining DOM helpers in `utils/misc.ts` into their single consumer or delete.
  > Note: geometry/parsing/scroll/fullscreen/title helpers localized; dead animation/visibility helpers deleted. Download owns a Solid anchor; popup guards use registered component refs through closing animations. 404 CSS loader localized (standalone consumer missed by TS-only inventory). 1,256 tests and frontend checks/smoke pass; documented Knip exception remains.
- [x] **P6.3** Sweep: `grep -rnE "document\.(querySelector|getElementById)|innerHTML|insertAdjacentHTML|createElement" src/ts` → only §2 exceptions remain. Sweep `<i class="fa` in `.tsx` → `Fa`.
  > Progress P6.3a: custom background and calendar markup/state/styles now Solid-owned; theme body class belongs to App, remaining shell icons use Fa and classList removed. Preserved dead settings-filter lookup behavior (old selector no longer matched Solid settings). Added image/error/calendar assertions; 1,258 tests, frontend checks and responsive/typing smoke pass with the documented Knip exception. Controller/standalone sweep remains.
  > Progress P6.3b: ad slots/messages, file pickers, settings highlights and input listeners now have component ownership/cleanup; challenge visibility and word clearing use owning APIs. Ad SCSS deleted. Preserved legacy event names and removal behavior. 1,263 tests, frontend checks and responsive/typing/hotkey smoke pass with the documented Knip exception. Third-party scripts and standalone entry sweep remains.
  > Progress P6.3c: page head updates, third-party scripts/fallback and hidden skill-issue screen now component-owned; serialized command separator remains data, rendered icons use Fa. Browser probes preserve inert analytics/EG parsing and active PW script execution/cleanup. 1,268 tests, frontend checks and time/words/quote/result/restart/hotkey smoke pass with the documented Knip exception. Standalone entries and final sweep remain.
  > Progress P6.3d: standalone email/404 entries now mount Solid components; removed inline controllers/styles/icons, preserved auth argument/callback defects and native input appearance. Nine auth regression cases; 1,277 tests and frontend checks pass with the documented Knip exception. Browser geometry matches both entries; reset focus verified after Solid's mount batch. Static policy entries/no-JS content and final sweep remain.
  > Progress P6.3e: all five standalone entries now prerender Solid and hydrate, preserving no-JS content; policy markup/handlers/styles migrated and shared header SCSS removed. All 146 policy text items match; native opt-out/hydration and application typing/hotkey/focus smoke pass. Existing green opt-out confirmation retained as a styling exception to preserve behavior. 1,279 tests and frontend checks pass with the documented Knip exception; final sweep remains.
  > Note P6.3f: result reveal/scroll, screenshot crop canvas and fallback visibility now component-owned; Wikipedia HTML conversion uses an inert parser. Sweep leaves mount entry lookups, declarative rich markup and §2 exceptions only. Added lifecycle/crop/parsing regressions; 1,284 tests, frontend checks and time/words/quote/result/restart/hotkey/focus smoke pass with the documented Knip exception.
- [x] **P6.4** SCSS (leftovers only; per D3 most removed during each task): delete files/sections no longer referenced (`popups.scss`, `commandline.scss`, `loading.scss`, `test.scss` parts, `media-queries-*.scss` parts). Keep selectors used by `static/themes` & `static/funbox`.
  > Note: deleted obsolete popup/login responsive rules, empty breakpoints, avatar/FPS/notification/checkbox wrappers and unused animations. Mobile commandline media rule moved to its Solid button; shared inputs, layout, word/history/debug/theme/funbox selectors retained. 1,284 tests, frontend checks and typing/result/restart smoke pass with the documented Knip exception.
- [x] **P6.5** Update `CLAUDE.md` / `AGENTS.md`: drop "partially migrated" + legacy `i` tag rule. Update `docs/CONTRIBUTING_ADVANCED.md` if it mentions HTML partials.
  > Note: contributor rules now describe Solid UI, component-owned imperative exceptions and Fa icons. Advanced contribution guide contains no HTML-partial instructions; unchanged.
- [x] **P6.6** Full check: `pnpm full-check` from root. Keep this file (D4); tick all boxes.

  > Note: all 28 full-check tasks pass (final run --concurrency=1 avoids host-load timeouts), including 1,285 frontend tests and 207 backend integration tests; direct lint/test/build and root Knip pass. Knip covers TSX/standalone/Storybook explicitly, retaining the P0.2 non-UI baseline and existing tooling/CSS/virtual-module exceptions via narrow allowlists. Removed obsolete Storybook patches; lint scripts/checker use agent format, and madge includes TSX.

---

## 5. Dependency graph (short)

```
P0.2, P0.3 ─┐
P1.x (parallel) ────────────┐
P2.x (parallel with P1) ────┤
P3.x (after P0.3) ──────────┼─> P4.x ─> P5.x ─> P6.x
```

Parallel agents: one on P1, one on P2, one on P3 is safe (disjoint files) — except shared files `mount.tsx`, `states/modals.ts`, `Modals.tsx`, `test.scss`: pull + rebase-free merge (`git pull --no-rebase`) before commit, resolve additively.

## 6. Risks

- Test-page perf regression (keystroke latency) — P4 measure every commit.
- Theme/funbox/custom CSS relying on ids/classes — grep `static/` before renaming.
- Focus + tab order on result screen and restart button (quick restart hotkeys).
- Chart hover ↔ word highlight coupling (P3.7/P3.9).
- Screenshot relies on exact DOM layout (P3.12).
- `Math` freezing + global hooks in `index.ts` must stay before `render`.
- Huge PR review — keep commits atomic and self-describing.

## 7. Decisions (fill in)

- **D1** ✅ Word rendering: imperative DOM inside Solid component (A). Reason: keystroke perf, low risk; fully reactive `<For>` (B) = possible follow-up PR with benchmarks.
- **D2** ✅ Router: use `@solidjs/router` 1.0 (follow-up, 1 October 2026). Standard matching/history with component-owned navigation guards and auth/loading bridge; existing page lifecycle/animations and cached typing-test refs retained. Supersedes the initial decision to keep `route-controller`.
- **D3** ✅ Convert each migrated component's styles to Tailwind in the same task/commit. Delete replaced SCSS.
- **D4** ✅ Keep this file in final PR (P6.6: tick all boxes, don't delete).
