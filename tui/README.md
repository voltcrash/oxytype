# Oxytype terminal client

`@voltcrash/oxytype` runs oxytype in a terminal with OpenTUI and Solid. It
requires Bun; OpenTUI loads its native renderer through Bun FFI.

```sh
pnpm dev-tui
pnpm lint-tui
pnpm test-tui
bun test __tests__/app.test.tsx # from tui/, after `bun run assets`
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

Terminal gaps and approximations are tracked in [MISSING.md](MISSING.md).
