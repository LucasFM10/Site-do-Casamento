# Imagem do site (Next.js 16, saída standalone) e do migrador do banco.
# A mesma imagem serve aos serviços `web` (node server.js) e `migrar`
# (node migrar.cjs) do docker-compose.yaml.

FROM node:24-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dependências, instaladas a partir do lockfile.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build. Não usa variáveis secretas: tudo que é segredo é lido em tempo
#    de execução, no servidor. O migrador é empacotado num arquivo só
#    (dist/migrar.cjs), sem precisar de node_modules.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm run db:empacotar

# 3. Execução: só o necessário, com usuário sem privilégios.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrar.cjs ./migrar.cjs
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/saude || exit 1

CMD ["node", "server.js"]
