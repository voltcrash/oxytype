# Oxytype

Oxytype is an independent, open-source typing test. It offers multiple test modes, languages, themes, live speed and accuracy feedback, and account-based result history.

This project began from the Monkeytype codebase and now has its own roadmap. We retain the original contributors' work and attribution in the Git history. Oxytype is licensed under [GPL-3.0](./LICENSE).

## Development

Use Node 24.21.0 and pnpm 12.8.1. Follow [the development setup guide](./docs/CONTRIBUTING_ADVANCED.md) for Firebase and backend configuration. See [the architecture overview](./docs/ARCHITECTURE.md) for the codebase and stack.

```sh
pnpm install
pnpm dev-fe
```

The frontend runs on port 3000. Run `pnpm dev` for the full workspace after configuring MongoDB, Redis, and the backend environment.

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) and the [code of conduct](./docs/CODE_OF_CONDUCT.md). Open bugs and feature requests in the [Oxytype repository](https://github.com/voltcrash/oxytype/issues). The [self-hosting guide](./docs/SELF_HOSTING.md) covers Docker deployment.

## Contact and security

Use [GitHub issues](https://github.com/voltcrash/oxytype/issues) for general questions and [the security policy](./docs/SECURITY.md) for private vulnerability reports. The planned public site is `oxytype.voltcrash.com`; the planned support address is `contact@voltcrash.com`. These endpoints are not active yet.
