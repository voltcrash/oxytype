# Oxytype terminal client

`@voltcrash/oxytype` runs oxytype in a terminal with OpenTUI and Solid. It
requires Bun; OpenTUI loads its native renderer through Bun FFI.

```sh
pnpm dev-tui
pnpm lint-tui
pnpm test-tui
bun test __tests__/app.test.tsx # from tui/
```

`bunfig.toml` preloads the OpenTUI Solid JSX transform for the app and tests.
Tests run with `bun test`; Node cannot load the renderer.

Typecheck uses the root oxlint flow. The tsconfig includes the DOM lib because
Solid's JSX element type references DOM nodes; OpenTUI renders no DOM.

OpenTUI is pinned to 0.5.10. Later releases declare Node >=26.4, which strict
engine checks reject on the repository's Node 24 toolchain.

Terminal gaps and approximations are tracked in [MISSING.md](MISSING.md).
