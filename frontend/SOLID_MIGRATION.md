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
- Third-party ad SDK containers (`controllers/ad-controller.ts`, `pw-ad-controller.ts`, `eg-ad-controller.ts`) — containers rendered by Solid (`Advertisement.tsx`), SDK fills them.
- Recaptcha.
- **Word/letter rendering hot path** (`test-ui.ts` `updateWordLetters`, `scrollTape`, caret positioning) — see decision D1.
- `noscript` + `#nocss` fallback in `html/warnings.html` (must work without JS/CSS).

## 3. Inventory (legacy UI remaining)

| Area | Files | LOC |
|---|---|---|
| Test page words/input/caret | `test/test-ui.ts`, `elements/caret.ts`, `test/caret.ts`, `test/pace-caret.ts`, `test/break-joining.ts`, `test/focus.ts`, `test/layout-emulator.ts`, `html/pages/test.html` | ~3.2k |
| Result screen | `test/result.ts`, `controllers/chart-controller.ts`, `elements/result-word-highlight.ts`, `test/replay-ui.ts`, `test/test-screenshot.ts`, `test/pb-crown.ts`, `html/pages/test-result.html` | ~3.3k |
| Test logic (DOM bits only) | `test/test-logic.ts`, `test/funbox/funbox*.ts`, `event-handlers/test.ts`, `event-handlers/global.ts` | DOM calls only |
| Commandline | `commandline/commandline.ts`, `commandline/lists*.ts`, `elements/input-validation.ts`, `html/popups.html#commandLine` | ~1.5k |
| Legacy modals/popups | `modals/practise-words.ts`, `popups/video-ad-popup.ts`, `utils/animated-modal.ts`, `html/popups.html` | ~680 |
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

- [~] **P1.1** Loading page → `components/pages/LoadingPage.tsx`. Move bar/spinner/error/text to signals in `states/loading-page.ts` (API kept: `updateBar`, `updateText`, `showSpinner`, `showError`, `showBar`). Remove `html/pages/loading.html`, markup in `pages/loading.ts` (keep `Page` object until P5). Drop `loading.scss` parts replaced.
- [ ] **P1.2** Test init failed → `components/pages/test/TestInitFailed.tsx`, signal `testInitError` in `states/test.ts`. Replace `elements/test-init-failed.ts` callers with setters. Remove `#testInitFailed` from `test.html`.
- [ ] **P1.3** Memory + layoutfluid timers → `components/pages/test/FunboxTimer.tsx` (one component, two instances or mode prop). Signals for visible/text. Remove `#memoryTimer`, `#layoutfluidTimer` from HTML; delete timer modules' DOM code.
- [ ] **P1.4** Restart button + test loading spinner (`#restartTestButton`, `.pageTest > .loading`) → `RestartTestButton.tsx`, `TestLoading.tsx`. Keep id `restartTestButton` (focus/tab logic in `input/hotkeys/quickrestart.ts`, `event-handlers/test.ts`).
- [ ] **P1.5** Monkey power (`elements/monkey-power.ts`) → `components/pages/test/MonkeyPower.tsx` (particles/screen shake). Canvas stays imperative inside component.
- [ ] **P1.6** Practise words modal → `components/modals/PractiseWordsModal.tsx` (`ModalId` `PractiseWords`). Update callers `commandline/lists/result-screen.ts`, `event-handlers/test.ts`. Remove `<dialog id="practiseWordsModal">`, `modals/practise-words.ts` (logic stays in `test/practise-words.ts`).
- [ ] **P1.7** Video ad popup → `components/popups/VideoAdPopup.tsx`. Keep `egVideoListener` global export. Remove `#videoAdPopupWrapper`, `popups/video-ad-popup.ts`.
- [ ] **P1.8** Ads containers in `index.html` / `test-result.html` → use `components/common/Advertisement.tsx` via mounts. Keep ids the ad controllers target.

### Phase 2 — Commandline (deps: none; parallel with P1)

- [ ] **P2.1** Extract commandline state (open, input value, mode, subgroup stack, selected index, warning, checking) to `states/commandline.ts` signals/store. Legacy `commandline.ts` reads/writes store; no render changes. Tests for filtering/matching (`commandline/util.ts` already tested).
- [ ] **P2.2** `components/modals/Commandline.tsx` rendering input, suggestions list (use `<For>`; virtualize only if current code limits count), warning, checking icon, input-validation (port `elements/input-validation.ts` to a hook or reuse `components/ui/form`). Register `Commandline` modal id (exists in `ModalId`). Keep keyboard nav + mouse hover behavior identical; keep `commandline.show()` API as thin wrapper → `showModal("Commandline", …)`.
- [ ] **P2.3** Remove `<dialog id="commandLine">`, `commandline.scss` → Tailwind, delete legacy render code. `commandline/lists/*.ts` data stays (not UI). Delete `utils/animated-modal.ts` if no users remain (also `commandline/types.ts` import).

### Phase 3 — Result screen (deps: P0.3)

Order matters; each sub-task a commit. Container first, then pieces.

- [ ] **P3.1** Result state: store `states/result.ts` holding computed result view model (stats, crown state, tags, quote info, daily lb rank, flags like `loginTip`, `retrySaving`). `test/result.ts#update` computes + sets store; still writes DOM. Tests for view-model builder.
- [ ] **P3.2** `components/pages/test/result/Result.tsx` shell mounted in place of `#result` wrapper; render stats groups (wpm, acc, raw, characters, consistency, time, test type, other, source) from store. Remove corresponding DOM writes + HTML.
- [ ] **P3.3** Crown (`test/pb-crown.ts`, `showCrown/updateCrown/showErrorCrownIfNeeded`) → `ResultCrown.tsx`.
- [ ] **P3.4** Tags group + edit button (`updateTagsAfterEdit`) → uses existing `EditResultTagsModal`.
- [ ] **P3.5** Quote buttons (report/favorite/rate, `updateRateQuote`) → `ResultQuoteActions.tsx`.
- [ ] **P3.6** Daily leaderboard rank group.
- [ ] **P3.7** Result chart: `chart-controller.ts` result chart → `ResultChart.tsx` using `ChartJs.tsx`; legend buttons (`scale`, `pbLine`, `tagPbLine`, `raw`, `burst`, `errors`) driven by config signals. Keep `toggleSmoothedBurst`, `toggleUserFakeChartData` globals. Hover-highlight integration with `result-word-highlight.ts` via callback prop.
- [ ] **P3.8** Words history (`#resultWordsHistory`, `toggleResultWords`, `applyBurstHeatmap`, copy buttons, heatmap legend) → `ResultWordsHistory.tsx`. Word markup generation may reuse pure fn from `test-ui.ts` (extract to `test/word-markup.ts` first).
- [ ] **P3.9** `result-word-highlight.ts` → hook `useResultWordHighlight` inside ResultWordsHistory/Chart.
- [ ] **P3.10** Replay (`test/replay-ui.ts`, `#resultReplay`) → `ResultReplay.tsx`. Replay playback timing logic stays in plain TS module; rendering via signals.
- [ ] **P3.11** Bottom buttons (next, repeat, practise, history, replay, screenshot, retry saving) → `ResultButtons.tsx`. Hotkeys/tab order must match.
- [ ] **P3.12** Screenshot (`test/test-screenshot.ts`): replace `qs` lookups with refs exposed from `Result.tsx` (e.g. `states/result.ts` holds element ref). `.ssWatermark` into JSX.
- [ ] **P3.13** Delete `html/pages/test-result.html`, dead SCSS in `test.scss` (result section), dead exports in `result.ts`. `result.ts` should now be logic-only.

### Phase 4 — Test page core (deps: P1.2–P1.4, P3.13) — highest risk

Perf critical: per-keystroke work must not regress. Measure with `utils/profiler-mode.ts` / devtools before+after each commit; note numbers in commit body.

- [ ] **P4.1** `components/pages/test/TestPage.tsx`: render full `.pageTest` structure (testconfig, wordsWrapper, textarea `#wordsInput`, `#paceCaret`, `#caret`, `#words`, keymap, monkey, live stats, premid, result) as JSX; child Solid components rendered directly instead of via `mount` entries. Replace `html/pages/test.html` with `<mount data-component="testpage">`. Legacy code still finds elements by id → works unchanged.
- [ ] **P4.2** Expose refs: `states/test-dom.ts` with `wordsEl`, `wordsWrapperEl`, `wordsInputEl`, `caretEl`, `paceCaretEl` set from `TestPage` refs. Replace `qs("#words")` etc. in `test-ui.ts`, `caret.ts`, `pace-caret.ts`, `focus.ts`, `input/input-element.ts`, `layout-emulator.ts`, `funbox-functions.ts`, `test-logic.ts`. No behavior change.
- [ ] **P4.3** Focus/blur (`test/focus.ts`, words blur) → driven by `testFocusState` signal + `cn` classes on TestPage (comment in `states/test.ts` says words blurred imperatively).
- [ ] **P4.4** Caret → `components/pages/test/Caret.tsx` owning element; `Caret` class keeps position math + animation, receives element via ref. Pace caret same.
- [ ] **P4.5** Words wrapper sizing (`updateWordsWrapperHeight`, `centerActiveLine`, `keepWordsInputInTheCenter`, `updateWordsInputPosition`) → reactive styles on TestPage from signals.
- [ ] **P4.6** Word rendering (D1 = A): keep imperative `updateWordLetters`/`addWord`/`scrollTape` inside a `Words.tsx` component's module; only lifecycle + container are Solid. Extract pure markup builders to `test/word-markup.ts` with tests. Do NOT convert to reactive `<For>` in this PR.
- [ ] **P4.7** Break joining / hints (`break-joining.ts`, `updateHintsPositionDebounced`, `setJoiningClass`) into Words component module.
- [ ] **P4.8** Remove remaining `qs`/`qsa` DOM calls from `test-logic.ts`, `funbox/*.ts` (funbox DOM effects → signals consumed by TestPage, e.g. classes on `#words`/body), `event-handlers/test.ts` (delegate listeners → JSX `onClick`).
- [ ] **P4.9** `test.scss` cleanup for converted pieces (keep selectors themes rely on).

### Phase 5 — App shell + routing (deps: P1.1, P1.8, P4.1)

- [ ] **P5.1** `components/App.tsx`: render header, `<main>`, all pages, footer, overlays, modals, popups, theme, devtools, bartimerprogress. `index.html` body → `<load src="html/warnings.html" />`, `.customBackground`, `<div id="app">` mount, funbox css link, scripts. Replace `mountComponents()` with single `render(<App/>)`. Delete `components/mount.tsx`.
- [ ] **P5.2** Page switching: `states/core.ts` already has `getActivePage`. Make pages render via `<Show>`/`<Switch>` on active page + existing `components/common/Page.tsx`; move page transition animation (`page-controller.ts`, `legacy-states/page-transition.ts`) into component. Keep `PageController.change()` API as a thin wrapper setting signal + running lifecycle hooks (`beforeShow` etc.).
- [ ] **P5.3** Router: `route-controller.ts` → keep own router (D2; no `@solidjs/router`); replace `[router-link]` delegated handler with `<A>`-like `Link` component; remove `pages/page.ts` `element: ElementWithUtils` field.
- [ ] **P5.4** `legacy-states/*` → move to `states/` as signals (composition, connection, glarses-mode, page-transition, remember-lazy-mode, slow-timer). Delete `legacy-states/`.
- [ ] **P5.5** `ui.ts` / `ready.ts` / `elements/no-css.ts` / `event-handlers/global.ts` DOM bits → App effects or `onMount`. `body.loading` class → App.

### Phase 6 — Utils + cleanup (deps: all above)

- [ ] **P6.1** Remove `ElementWithUtils`, `qs`, `qsa`, `qsr` from `utils/dom.ts` (keep pure helpers if any). Delete `hooks/useRefWithUtils.ts` (replace with `hooks/useRef.ts`). Delete `utils/skeleton.ts`. Remove `qs/qsa/qsr` from `addToGlobal` in `index.ts`.
- [ ] **P6.2** Move remaining DOM helpers in `utils/misc.ts` into their single consumer or delete.
- [ ] **P6.3** Sweep: `grep -rnE "document\.(querySelector|getElementById)|innerHTML|insertAdjacentHTML|createElement" src/ts` → only §2 exceptions remain. Sweep `<i class="fa` in `.tsx` → `Fa`.
- [ ] **P6.4** SCSS (leftovers only; per D3 most removed during each task): delete files/sections no longer referenced (`popups.scss`, `commandline.scss`, `loading.scss`, `test.scss` parts, `media-queries-*.scss` parts). Keep selectors used by `static/themes` & `static/funbox`.
- [ ] **P6.5** Update `CLAUDE.md` / `AGENTS.md`: drop "partially migrated" + legacy `i` tag rule. Update `docs/CONTRIBUTING_ADVANCED.md` if it mentions HTML partials.
- [ ] **P6.6** Full check: `pnpm full-check` from root. Keep this file (D4); tick all boxes.

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
- **D2** ✅ Router: keep custom `route-controller`. Reason: navigation guards + page lifecycle/loading modes already built in; `@solidjs/router` = possible follow-up PR.
- **D3** ✅ Convert each migrated component's styles to Tailwind in the same task/commit. Delete replaced SCSS.
- **D4** ✅ Keep this file in final PR (P6.6: tick all boxes, don't delete).
