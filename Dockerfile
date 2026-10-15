# Production image. Build: docker build -t research-repo .  Run with DATABASE_URL and UPLOAD_DIR set.
FROM node:22-alpine AS base
RUN corepack disable && npm install -g pnpm@12
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Has the full node_modules and the Prisma CLI: used for `prisma migrate deploy` and the seed.
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
