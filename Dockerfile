# Poke'friends game server (Express + Socket.IO) for Render / Railway / any container host.
# Builds the shared package then the server, and runs the compiled output.
# Root-context build so the pnpm workspace (shared ← server) resolves correctly.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

# Install deps for the workspaces the server needs (cached unless manifests change)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile

# Build shared → server
COPY shared/ shared/
COPY server/ server/
COPY tsconfig.base.json ./
RUN pnpm --filter @texas-holdem/shared build && pnpm --filter server build

# ── Runtime image: only prod deps + compiled JS ──
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --prod
# compiled output
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
