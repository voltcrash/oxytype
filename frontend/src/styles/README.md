# Styling

- `tailwind.css`: application entry. `standalone.css`: auth/error/legal entries.
- `theme.css`: Tailwind palette, breakpoints, reusable utilities. `layers.css`: shared cascade order.
- Defaults and compatibility hooks use `@apply`; component classes override them in the utilities layer.
- Keep word/letter, caret, theme and funbox selectors stable. Imperative typing nodes need selector-based state styles.
- Keep animation names stable: runtime styles and external theme/funbox CSS reference them. Keyframes require ordinary CSS declarations.
- `font-styles.ts` generates ignored CSS from font metadata and official Font Awesome CSS. Development uses full fonts; production uses previews/icon subsets. Separate directories avoid cross-mode overwrites. Storybook registers the same plugin.
- Standalone grids retain their original dimensions and native auth inputs.

Checks: `pnpm lint-styles`, frontend build/tests, `pnpm oxlint --type-aware --type-check --format agent frontend`.
