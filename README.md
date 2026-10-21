# Projeto Casamento - Lucas & Amanda

Site do casamento de Lucas e Amanda: informações da cerimônia, confirmação
individual de presença e (em breve) lista de presentes com pagamento.

## Stack

- **Next.js 16** (App Router, saída standalone), **React 19**, **TypeScript**
  (strict), Tailwind CSS 3 e o `dialog` do shadcn/ui.
- **PostgreSQL 17** com **Drizzle ORM** (`postgres.js`). Esquema em
  `src/db/esquema.ts`, migrações em `drizzle/`.
- **Docker Compose** para o deploy no Coolify: `web`, `migrar`, `postgres`,
  `backup`. Detalhes em [docs/banco-e-deploy.md](docs/banco-e-deploy.md).
- Integrações configuradas só por variáveis de ambiente: **Mercado Pago**
  (pagamentos e webhook) e **Evolution API** (WhatsApp).

## Estrutura

```
src/app/                    páginas, Server Action da confirmação (actions.ts)
src/app/api/saude           health check (site + banco)
src/app/api/mercadopago     webhook assinado e idempotente
src/components/             landing page (HeroCarousel, Countdown, WeddingActions)
src/db/esquema.ts           tabelas, checks e índices
src/lib/servidor/           código só de servidor: banco, Mercado Pago,
                            pedidos de presentes, Evolution API, WhatsApp
scripts/migrar.ts           migrador (roda a cada deploy)
scripts/permissoes.ts       permissões mínimas do papel do site no banco
tests/banco/                migrações e permissões num PostgreSQL real (Docker)
```

## Banco de dados

| Tabela | Para quê |
|---|---|
| `confirmacoes` | Confirmações de presença: nome, telefone (`55` + DDD + número), `sim`/`nao` |
| `administradores` | Quem poderá entrar no painel. **Só o dono do banco cria** |
| `presentes` | Catálogo da lista de presentes (preço em centavos) |
| `pedidos` | Compra de presente sem login; status muda só pelo pagamento conferido |
| `webhook_eventos` | Idempotência das notificações do Mercado Pago |

O site entra no banco com o papel `site`, de permissões mínimas: registra
confirmações, cria pedidos pendentes e atualiza status de pagamento, mas não
cria administradores, não mexe no catálogo, não apaga nada e não altera a
estrutura. Criar um administrador (como dono do banco):

```sql
INSERT INTO administradores (nome, telefone) VALUES ('Lucas', '5583999999999');
```

## Rodar localmente

```bash
cp .env.example .env    # preencher PGPASSWORD e POSTGRES_PASSWORD (16+ caracteres)
docker compose -f docker-compose.yaml -f compose.local.yaml up --build
```

Site em `http://localhost:3000`; Postgres em `127.0.0.1:55433`.

Para desenvolver com recarga automática, suba só o banco e o migrador e rode
o Next fora do Docker (o `.env` já aponta para `127.0.0.1:55433`):

```bash
docker compose -f docker-compose.yaml -f compose.local.yaml up -d postgres migrar
npm install
npm run dev
```

## Verificações

```bash
npm run lint
npm test              # testes de unidade (vitest)
npm run build
npm run test:banco    # migrador e permissões num PostgreSQL de teste (precisa do Docker)
```

## Mudar o esquema

```bash
# editar src/db/esquema.ts (e scripts/permissoes.ts, se houver tabela nova)
npm run db:gerar      # gera drizzle/NNNN_*.sql; revisar antes do commit
npm run test:banco
```

Tabela nova sem entrada em `scripts/permissoes.ts` faz o migrador parar com
erro, de propósito.

## Integrações

Todas opcionais e desligadas enquanto as variáveis estiverem vazias.

**WhatsApp (Evolution API).** Com `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`
e `EVOLUTION_INSTANCE` preenchidas, o site envia as mensagens cujo texto
estiver definido:

| Variável | Quando |
|---|---|
| `WHATSAPP_MSG_CONFIRMACAO_SIM` | convidado confirmou presença |
| `WHATSAPP_MSG_CONFIRMACAO_NAO` | convidado avisou que não vai |
| `WHATSAPP_MSG_PRESENTE_APROVADO` | pagamento de presente aprovado |

No texto, `{nome}` vira o primeiro nome e `{presente}` o nome do presente;
`\n` quebra linha. O envio acontece depois da resposta ao convidado e uma
falha só vai para o log (`src/lib/servidor/whatsapp.ts`).

**Mercado Pago.** `MP_ACCESS_TOKEN` (secreto), `MP_PUBLIC_KEY` e
`MP_WEBHOOK_SECRET`. A base de pagamento está em
`src/lib/servidor/pedidos.ts` (Pix e cartão, preço sempre lido do banco,
confirmação conferindo valor, moeda e referência no próprio Mercado Pago) e
o webhook em `/api/mercadopago/webhook`. A página de checkout ainda não
existe. Configuração do webhook: [docs/banco-e-deploy.md](docs/banco-e-deploy.md).
