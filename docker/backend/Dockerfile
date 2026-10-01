FROM node:24.21.0-alpine3.24 AS builder

WORKDIR /app

#copy
COPY ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json", "./"]
COPY patches patches
COPY packages packages
COPY backend backend
COPY frontend/package.json frontend/package.json
COPY frontend/storybook/package.json frontend/storybook/package.json

#gimme pnpm + build
ARG TARGETARCH
RUN --mount=type=cache,id=oxytype-pnpm-${TARGETARCH},target=/root/.local/share/pnpm/store,sharing=locked npm i -g pnpm@12.8.1 && \
    pnpm i --frozen-lockfile && \
    pnpm run build-be

#deploy (install all non-dev dependencies in a single node_module folder)
RUN --mount=type=cache,id=oxytype-pnpm-${TARGETARCH},target=/root/.local/share/pnpm/store,sharing=locked pnpm --config.allowUnusedPatches=true deploy --legacy --filter @oxytype/backend --prod /prod/backend

#---------------------------------

## target image
FROM node:24.21.0-alpine3.24

## get server_version from build-arg, default to UNKNOWN
ARG server_version=UNKNOWN

# COPY to target
COPY --from=builder /prod/backend/node_modules /app/backend/node_modules
COPY --from=builder /prod/backend/dist /app/backend/dist
COPY --from=builder /prod/backend/email-templates /app/backend/email-templates
COPY --from=builder /prod/backend/redis-scripts /app/backend/redis-scripts
COPY --from=builder /prod/backend/private /app/backend/private

## to build directory
WORKDIR /app/backend/dist

## logs 
RUN mkdir -p /app/backend/dist/logs

COPY ["docker/backend/entry-point.sh", "./"]

RUN echo "${server_version}" > /app/backend/dist/server.version

#run in prod mode, but don't require anti-cheat, email client or firebase
ENV MODE=prod
ENV BYPASS_ANTICHEAT=true
ENV BYPASS_EMAILCLIENT=true
ENV BYPASS_FIREBASE=true

EXPOSE 5005
USER node

CMD [ "/bin/sh", "./entry-point.sh" ]
