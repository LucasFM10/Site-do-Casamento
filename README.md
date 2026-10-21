# Projeto Casamento - Lucas & Amanda

Site do casamento de Lucas e Amanda: página inicial em tela única com as
informações da cerimônia, confirmação individual de presença, lista de
presentes com pagamento por Pix e um painel para os noivos (`/admin`).

## Stack

- **Next.js 16** (App Router, saída standalone), **React 19**, **TypeScript**
  (strict), Tailwind CSS 3 e o `dialog` do shadcn/ui.
- **PostgreSQL 17** com **Drizzle ORM** (`postgres.js`). Esquema em
  `src/db/esquema.ts`, migrações em `drizzle/`.
- **Docker Compose** para o deploy no Coolify: `web`, `migrar`, `postgres`,
  `backup`. Detalhes em [docs/banco-e-deploy.md](docs/banco-e-deploy.md).
- Integrações configuradas só por variáveis de ambiente: **Mercado Pago**
  (Pix e webhook) e **Evolution API** (WhatsApp).

## Páginas

| Rota | Para quê |
|---|---|
| `/` | Página inicial em tela única (100dvh): fotos, contagem regressiva, informações, confirmação de presença |
| `/presentes` | Vitrine da lista de presentes |
| `/presentes/[id]` | Fotos, descrição e compra (nome, e-mail, WhatsApp e mensagem opcionais; sem cadastro) |
| `/presentes/pedido/[id]` | QR Code e copia e cola do Pix, espera pela confirmação e agradecimento |
| `/admin/login` | Login do painel (celular + senha) |
| `/admin` | Resumo: presença, valores arrecadados, últimas mensagens |
| `/admin/confirmacoes` | Convidados com busca, filtro, histórico de respostas e planilha CSV |
| `/admin/presentes` | Cadastro, ordem, fotos, disponibilidade e remoção dos presentes |
| `/admin/pedidos` | Compras, status dos pagamentos e mensagens recebidas |
| `/admin/informacoes` | Data, horários, locais, endereços, mapas e textos do site |
| `/admin/fotos` | Fotos do carrossel da página inicial |

O painel não tem link no site público e não é indexado.

## Estrutura

```
src/app/                    páginas; Server Actions da confirmação (actions.ts),
                            da compra (presentes/acoes.ts) e do painel (admin/acoes.ts)
src/app/api/saude           health check (site + banco)
src/app/api/mercadopago     webhook assinado e idempotente
src/app/api/imagens/[id]    imagens guardadas no banco (cache longo)
src/app/api/pedidos/[id]    status do pedido para a página do Pix
src/components/             página inicial, lista de presentes e painel
src/db/esquema.ts           tabelas, checks e índices
src/lib/                    regras compartilhadas (configurações, validações,
                            consolidação das confirmações, dinheiro)
src/lib/servidor/           código só de servidor: banco, login do painel,
                            Mercado Pago, pedidos, presentes, imagens, limites,
                            Evolution API, WhatsApp
scripts/migrar.ts           migrador (roda a cada deploy)
scripts/permissoes.ts       permissões mínimas do papel do site no banco
tests/banco/                migrações e permissões num PostgreSQL real (Docker)
```

## Banco de dados

| Tabela | Para quê |
|---|---|
| `confirmacoes` | Confirmações de presença: nome, telefone (`55` + DDD + número), `sim`/`nao`. Nada é sobrescrito; vale a resposta mais recente de cada convidado |
| `administradores` | Quem entra no painel, com hash bcrypt da senha. **Só o dono do banco cria** |
| `sessoes_admin` | Sessões do painel (só o SHA-256 do token) |
| `limite_tentativas` | Contagem para limitar login errado, Pix gerado e confirmações por IP |
| `configuracoes` | Informações editáveis do site (chave e valor; padrões em `src/lib/configuracoes.ts`) |
| `presentes` | Catálogo (preço em centavos, quantidade máxima opcional, ordem, ativo) |
| `imagens` | Fotos dos presentes e do carrossel (JPEG/PNG/WebP até 1,5 MB) |
| `pedidos` | Compra de presente sem login, com mensagem opcional; status muda só pelo pagamento conferido |
| `webhook_eventos` | Idempotência das notificações do Mercado Pago |

O site entra no banco com o papel `site`, de permissões mínimas: registra
confirmações, cria pedidos pendentes, atualiza status de pagamento e, pelo
painel, mantém catálogo, imagens e configurações. Não cria nem altera
administradores, não apaga confirmação nem pedido, não muda valor de pedido
e não altera a estrutura (`scripts/permissoes.ts`).

### Criar um administrador

Só o dono do banco, pelo terminal do servidor (guia completo em
[docs/banco-e-deploy.md](docs/banco-e-deploy.md#5-administradores)):

```sql
INSERT INTO administradores (nome, telefone, senha_hash)
VALUES ('Lucas', '5583999999999', crypt('uma-senha-forte', gen_salt('bf', 12)));
```

O login é o celular (com DDD) e a senha.

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

O cookie do painel é `Secure`: funciona em `https://` e em
`http://localhost`, mas não por IP da rede local.

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
| `WHATSAPP_MSG_PRESENTE_APROVADO` | pagamento de presente aprovado (se o convidado informou o WhatsApp) |

No texto, `{nome}` vira o primeiro nome e `{presente}` o nome do presente;
`\n` quebra linha. O envio acontece depois da resposta ao convidado e uma
falha só vai para o log (`src/lib/servidor/whatsapp.ts`).

**Mercado Pago.** `MP_ACCESS_TOKEN` (secreto) e `MP_WEBHOOK_SECRET`. O
checkout é só por Pix: o preço vem sempre do banco, o pedido nasce pendente e
o status muda pelo webhook (`/api/mercadopago/webhook`) ou pela consulta da
página do pedido, conferindo valor, moeda e referência no próprio Mercado
Pago. Sem o Access Token, a lista aparece, mas o convidado vê “pagamento
indisponível”. Configuração do webhook:
[docs/banco-e-deploy.md](docs/banco-e-deploy.md). O pagamento com cartão
está pronto no servidor (`pagarComCartao`), mas sem página.
