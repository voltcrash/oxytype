FROM node:24.21.0-alpine3.24 AS builder
WORKDIR /app

#ENV
ENV BACKEND_URL=###OXYTYPE_BACKEND_URL### TURNSTILE_SITE_KEY=###TURNSTILE_SITE_KEY###

#COPY
COPY ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json", "./"]
COPY patches patches
COPY packages packages
COPY frontend frontend
COPY backend/package.json backend/package.json


#gimme pnpm + build
ARG TARGETARCH
RUN --mount=type=cache,id=oxytype-pnpm-${TARGETARCH},target=/root/.local/share/pnpm/store,sharing=locked npm i -g pnpm@12.8.1 && \
    pnpm i --frozen-lockfile && \
    pnpm run build-fe

# COPY to target
FROM nginx:1.31.6-alpine3.24

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/frontend/updateConfig.sh /docker-entrypoint.d/updateConfig.sh
RUN chmod +x /docker-entrypoint.d/updateConfig.sh

# entry
#CMD ["./entryPoint.sh"]
