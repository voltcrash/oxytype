# Oxytype

Oxytype is an independent, open-source typing test. It offers multiple test modes, languages, themes, live speed and accuracy feedback, and account-based result history.

This project began from the Monkeytype codebase and now has its own roadmap. We retain the original contributors' work and attribution in the Git history. Oxytype is licensed under [GPL-3.0](./LICENSE).

## Development

Use Node 24.21.0 and pnpm 12.8.1. Follow [the development setup guide](./docs/CONTRIBUTING_ADVANCED.md) for Better Auth and backend configuration. See [the architecture overview](./docs/ARCHITECTURE.md) for the codebase and stack.

```sh
pnpm install
pnpm dev-fe
```

The frontend runs at `http://localhost:3000` without opening a browser. Set `SERVER_OPEN=true` in `frontend/.env` or run `SERVER_OPEN=true pnpm dev-fe` to open your default browser on startup. Run `pnpm dev` for the full workspace after applying local D1 migrations and copying `backend/.dev.vars.example` to `.dev.vars`.

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) and the [code of conduct](./docs/CODE_OF_CONDUCT.md). Open bugs and feature requests in the [Oxytype repository](https://github.com/voltcrash/oxytype/issues). The [self-hosting guide](./docs/SELF_HOSTING.md) covers Worker deployment and static frontend hosting.

## Contact and security

Public site: [oxytype.voltcrash.com](https://oxytype.voltcrash.com). See [production setup](./docs/PRODUCTION_SETUP.md) for deployment and updates.

Use [GitHub issues](https://github.com/voltcrash/oxytype/issues) for general questions and [the security policy](./docs/SECURITY.md) for private vulnerability reports. The planned support address `contact@voltcrash.com` is not active yet.
