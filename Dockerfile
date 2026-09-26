# EPOCH in one container: the API, the built console and the public demo.
# The showcase (drift recorded, INC-3312 open, futures A and B measured) is
# built once here, so the running service restores it in a moment.

FROM node:22-bookworm-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends git python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.4.2
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sample-app/package.json packages/sample-app/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build \
 && EPOCH_SHOWCASE_SNAPSHOT=/app/.showcase pnpm run showcase:snapshot

FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# The showcase restore replaces /app/.epoch and /app/data, so the app user owns /app itself.
RUN chown node:node /app
COPY --from=build --chown=node:node /app /app
USER node
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    EPOCH_PUBLIC_DEMO=1 \
    EPOCH_CONSOLE_DIR=/app/dist \
    EPOCH_SHOWCASE_SNAPSHOT=/app/.showcase \
    EPOCH_TEST_CONCURRENCY=2
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/api/server.ts"]
