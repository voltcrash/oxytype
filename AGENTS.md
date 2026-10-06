Be extremely concise. Sacrifice grammar for concision.
Frontend UI uses SolidJS `.tsx` components. Keep imperative DOM work inside component-owned refs/lifecycles; allowed exceptions are in `frontend/SOLID_MIGRATION.md`.
Single test file: `pnpm vitest run path/to/test.ts`
When running oxc lint, always use `--format agent`.
For typechecking, use `pnpm oxlint --type-aware --type-check` instead of `tsc`.
For styling, use Tailwind CSS, class property, `cn` utility. Do not use classlist. Only colors available are those defined in Tailwind config.
Use the `Fa` component for icons.
In plan mode, before writing up a plan, ask clarifying questions if needed. At the end of plan mode, give me a list of unresolved questions to answer, if any. Make them concise.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
