# Contributing - Advanced

## **Table of Contents**

- [Contributing - Advanced](#contributing---advanced)
  - [**Table of Contents**](#table-of-contents)
  - [Prerequisites](#prerequisites)
    - [Git](#git)
    - [NodeJS and PNPM](#nodejs-and-pnpm)
    - [Docker (Recommended but Optional)](#docker-recommended-but-optional)
    - [Better Auth](#better-auth)
    - [Config file](#config-file)
    - [Databases (optional if running frontend only)](#databases-optional-if-running-frontend-only)
  - [Building and Running Oxytype](#building-and-running-oxytype)
    - [Dependencies (if running manually)](#dependencies-if-running-manually)
    - [Both Frontend and Backend](#both-frontend-and-backend)
    - [Backend only](#backend-only)
    - [Frontend only](#frontend-only)
  - [Standards and Guidelines](#standards-and-guidelines)
  - [Questions](#questions)

## Prerequisites

This contribution guide is for cases in which you need to test the functionality of your changes, or if you need to take screenshots of your changes. You will need a computer with a stable internet connection, a text editor, Git, and NodeJS with version 24.21.0. There are some additional requirements depending on what you're looking to contribute, such as MongoDB for authentication and Docker for the backend. Read the below sections to understand how to set up each of these tools.

### Git

> [!WARNING]
> **If you are on Windows, run `git config --global core.autocrlf false` before cloning this repo to prevent CRLF errors.**

Git is optional but we recommend you utilize it. Oxytype uses the Git source control management (SCM) system for its version control. Assuming you don't have experience typing commands in the command line, we suggest installing [Sourcetree](https://www.sourcetreeapp.com/). You will be able to utilize the power of Git without needing to remember any cryptic commands. Using a Git client such as Sourcetree won't give you access to the full functionality of Git, but provides an easy-to-understand graphical user interface (GUI). Once you have downloaded Sourcetree, run the installer. While installing Sourcetree, keep your eyes peeled for the option to also install Git with Sourcetree. This is the option you will need to look for in order to install Git. **Make sure to click yes in the installer to install Git with Sourcetree.**

### NodeJS and PNPM

Currently, the project is using version `24.21.0 LTS`.

Vite+ reads `.node-version`; nvm reads `.nvmrc`. Keep both version pins equal.

If you use `nvm` (if you use Windows, use [nvm-windows](https://github.com/coreybutler/nvm-windows)) then you can run `nvm install` and `nvm use` (you might need to specify the exact version eg: `nvm install 24.21.0` then `nvm use 24.21.0`) to use the version of Node.js in the `.nvmrc` file.

Alternatively, you can navigate to the NodeJS [website](https://nodejs.org/en/) to download it from there.

For package management, we use `pnpm` instead of `npm` or `yarn`. You can install it by running `npm i -g pnpm@12.8.1`. This will install `pnpm` globally on your machine.

### Docker (Recommended but Optional)

You can use docker to run the frontend and backend. This will take care of OS-specific problems but might be a bit more resource-intensive. You can download it from the [Docker website](https://www.docker.com/get-started/#h_installation).

### Better Auth

Email/password authentication uses the backend's MongoDB database. No external auth project or frontend credentials are needed. Copy `backend/example.env` to `backend/.env`, start MongoDB/Redis, and run the backend.

Local defaults use `http://localhost:3000` for the frontend and `http://localhost:5005/auth` for auth. Production requires `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL` (public auth URL), and `FRONTEND_URL` (frontend origin). Generate a secret with `openssl rand -base64 32`.

Optional Google/GitHub sign-in uses backend-only `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET`. Register `BETTER_AUTH_URL/callback/google` and `BETTER_AUTH_URL/callback/github` with the providers. SMTP enables verification and password reset emails.

Existing authentication accounts are not imported. Create a new account after switching to Better Auth. Firebase Hosting remains an optional static deployment target for the release CLI; it is unrelated to authentication.

### Config file

If you want to access the frontend from other machines on your network create a file `frontend/.env` with this content:

```
BACKEND_URL="https://<Your backend host>"
```

Set backend `FRONTEND_URL` and `BETTER_AUTH_URL` to matching public URLs; serve both on the same site over HTTPS.

### Databases (optional if running frontend only)

Follow these steps if you want to work on anything involving the database/account system. Otherwise, you can skip this section.

1. Inside the backend folder, copy `example.env` to `.env` in the same directory.

   - The backend Docker scripts read port bindings from this file. If `27017`, `6379`, or `5005` are already in use on your machine, update `DOCKER_DB_PORT`, `DOCKER_REDIS_PORT`, and `DOCKER_SERVER_PORT` before starting Docker.

2. Setup the database server

| Manual                                                                                                                                                                                                                                                         | Docker (recommended)                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <ol><li>Install [MongoDB Community Edition](https://docs.mongodb.com/manual/administration/install-community/)</li><li>Install [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/)</li><li>Make sure both are running</li></ol> | <ol><li>Install [Docker](http://www.docker.io/gettingstarted/#h_installation) on your machine</li><li>Run `npm run docker-db-only` from the `./backend` directory</li></ol> |

3. (Optional) Install [MongoDB-compass](https://www.mongodb.com/try/download/compass?tck=docs_compass). This tool can be used to see and manipulate your database visually.
   - To connect, type `mongodb://localhost:27017` in the connection string box and press connect. The Oxytype database will be created and shown after the server is started.

## Building and Running Oxytype

It's time to run Oxytype. Just like with the databases, you can run the frontend and backend manually or with Docker.

### Dependencies (if running manually)

Run `pnpm i` in the project root to install all dependencies.

### Both Frontend and Backend

Manual:

```
npm run dev
```

### Backend only

| Manual           | Docker                         |
| ---------------- | ------------------------------ |
| `npm run dev-be` | `cd backend && npm run docker` |

### Frontend only

| Manual           | Docker                          |
| ---------------- | ------------------------------- |
| `npm run dev-fe` | `cd frontend && npm run docker` |

By default, these commands will start a local development website on [port 3000](http://localhost:3000) and a local development server on [port 5005](http://localhost:5005). They will automatically rebuild the website/server when you make changes in the `src/` directory. Use <kbd>Ctrl+C</kbd> to stop them.

> [!NOTE]
> Rebuilding doesn't happen instantaneously and depends on your machine, so be patient for changes to appear.



## Standards and Guidelines

Code formatting and linting is enforced by [Oxc (Oxfmt and Oxlint)](https://github.com/oxc-project/oxc), which automatically runs every time you make a commit.

`pnpm lint-fast` runs without type checking; `pnpm lint` includes type-aware rules and TypeScript diagnostics. `pnpm exec vp check` applies workspace rules, including frontend and backend overrides.

After upgrading Vite+, run `pnpm lint-check-config --write` to refresh the application category exclusions. CI verifies that these match the package configurations.

For guidelines on commit messages, adding themes, languages, or quotes, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md). Following these guidelines will increase the chances of getting your change accepted.

## Questions

Open an [issue](https://github.com/voltcrash/oxytype/issues) or a [discussion](https://github.com/voltcrash/oxytype/discussions) in this repository.
