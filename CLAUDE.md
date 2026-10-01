Be extremely concise. Sacrifice grammar for concision.
Frontend UI uses SolidJS `.tsx` components. Keep imperative DOM work inside component-owned refs/lifecycles; allowed exceptions are in `frontend/SOLID_MIGRATION.md`.
Single test file: `pnpm vitest run path/to/test.ts`
When running oxc lint, always use `--format agent`.
For typechecking, use `pnpm oxlint --type-aware --type-check` instead of `tsc`.
For styling, use Tailwind CSS, class property, `cn` utility. Do not use classlist. Only colors available are those defined in Tailwind config.
Use the `Fa` component for icons.
In plan mode, before writing up a plan, ask clarifying questions if needed. At the end of plan mode, give me a list of unresolved questions to answer, if any. Make them concise.