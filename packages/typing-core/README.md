# Typing core

Shared TypeScript source for web and terminal clients. No build step, browser
state, DOM rendering or implicit network/storage access. Import from
`@oxytype/typing-core` or a subpath such as `@oxytype/typing-core/events/stats`.

`createWordsGenerator(deps)` handles all modes, punctuation/numbers, repeats,
custom sections and funbox transforms. Supply config/state getters, custom text,
a `QuotesController`, and language transforms. Language, quote, poetry and
Wikipedia loaders accept client-owned fetch/asset adapters. Wikipedia additionally
accepts an HTML-to-text adapter.

`createTestSession(config, deps)` creates independent event, input and timer state.
Config may be an object or a getter. Supply initial `words` (including inter-word
commit separators; omit the last separator for a finite test), or call
`generate(language, generator)`. A generator's `getWordsLength` should read
`session.getWords().length`; provide it via `deps.generator` for ongoing generation.
`getContext` can provide live quote/custom-text/word state for an existing client.

- `await session.insert(text, timestamp)` and `session.delete(type, timestamp)`
  apply input rules. Serialize input calls when generation awaits an asset.
- `session.record(type, timestamp, data)` records physical key events and IME
  metadata; terminal clients decide how to represent missing key-up signals.
- `session.advance(timestamp)` emits due ticks; clients own the scheduler.
- `session.on("word" | "input" | "tick" | "finish", listener)` returns an
  unsubscribe function. `finish(timestamp)` ends manually; `reset()` restarts
  state while retaining target words for repeat/practice.
- Finalize held keys with `recorder.forceReleaseAllKeys()` and
  `recorder.cleanupData()`, then use `buildEventLog()` and
  `complete(log, context)` to build the result. `hashResult({...result, uid})`
  preserves the web payload hash.

The web uses this facade for event state, word generation and results. Its input
handlers use the same pure insertion/deletion/validation rules; rendering,
composition lifecycle, scrolling and browser key handling stay with the web.

Parity tests retain eight real web keystroke recordings and 61 seeded generator
snapshots. Core tests run in Node. From the root:

```sh
pnpm lint-pkg
pnpm test-pkg
pnpm vitest run packages/typing-core/__test__/session.spec.ts
```

`__fixtures__/keystrokes` contains raw input/timings, event logs and result
snapshots/hashes. `scripts/record-fixtures.ts` records web fixtures against a running
frontend. Only regenerate baseline snapshots for intentional behavior changes.
