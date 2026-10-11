FROM node:22.20.0-alpine3.22 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci \
    && cp package-lock.json node_modules/.wedding-grace-package-lock.json

FROM node:22.20.0-alpine3.22 AS development
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    WATCHPACK_POLLING=true

COPY package.json package-lock.json ./
RUN npm ci \
    && cp package-lock.json node_modules/.wedding-grace-package-lock.json
COPY scripts/docker-dev-entrypoint.sh /usr/local/bin/docker-dev-entrypoint
RUN chmod +x /usr/local/bin/docker-dev-entrypoint

EXPOSE 3000

CMD ["docker-dev-entrypoint"]

FROM node:22.20.0-alpine3.22 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.20.0-alpine3.22 AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
