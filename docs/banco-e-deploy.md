# Banco de dados e deploy

Guia do PostgreSQL + Drizzle e do deploy no Coolify. A arquitetura é a
mesma do projeto Adriana Melo, simplificada para o site do casamento.

## 1. Arquitetura

| Serviço | Papel |
|---|---|
| `web` | Next.js 16: site, confirmação de presença, webhook. Único com domínio |
| `migrar` | A cada deploy, antes do site: migrações e permissões. Depois fica parado e saudável |
| `postgres` | PostgreSQL 17, volume `postgres_data`, sem porta nem domínio |
| `backup` | `pg_dump` diário no volume `backups` |

```
Navegador ──HTTPS──► Coolify (proxy) ──► web (Next.js)
                                          │  papel "site" (menor privilégio)
                                          ▼
                       rede interna ──► postgres (volume postgres_data)
                                          ▲                ▲
                     migrar (dono, a cada deploy)    backup (dono)
```

O navegador nunca fala com o banco. Toda leitura e escrita passa pelo
servidor do site.

## 2. Menor privilégio no PostgreSQL

| Papel | Quem usa | Pode |
|---|---|---|
| Dono (`POSTGRES_USER`) | migrador, backup, você pelo psql | tudo no banco da aplicação |
| `site` (`PGUSER`) | o site | só o que `scripts/permissoes.ts` lista |

O papel `site` é criado e ajustado pelo migrador a cada deploy (senha do
ambiente, sem superusuário, até 30 conexões) e recebe as permissões **do
zero**: `SELECT` nas tabelas, `INSERT` só em `confirmacoes`, `pedidos` e
`webhook_eventos`, e `UPDATE` só no status/id de pagamento do pedido e no
`processado_em` do evento. Pedido criado pelo site nasce `pendente`
(gatilho da migração `0001`). Não lê o esquema `drizzle`, não cria tabelas,
não cria administradores. Testado em `tests/banco/permissoes.test.mjs`.

## 3. Migrações

O serviço `migrar` roda `node migrar.cjs` a cada deploy: espera o banco,
trava contra outro migrador (`pg_advisory_lock`), aplica as migrações
pendentes de `drizzle/` e as permissões do papel `site`. Se falhar, o site
**não sobe** e o deploy aparece com erro no Coolify.

Regras: nunca editar migração já aplicada; mudança destrutiva (drop, rename,
troca de tipo) em duas etapas, em deploys separados.

## 4. Deploy no Coolify

Recurso **Application → Docker Compose**, repositório
`LucasFM10/Site-do-Casamento`, branch `main`, compose em
`/docker-compose.yaml`.

1. New Resource → repositório pelo GitHub App → branch `main` → build pack
   **Docker Compose**.
2. Preencher as variáveis manuais (abaixo). As `SERVICE_*` são geradas.
3. Deploy. O log do `migrar` deve terminar com:

   ```
   Migrações aplicadas.
   Permissões do papel do site (site) aplicadas.
   ```

4. Conferir `https://<domínio>/api/saude` (responde `ok`) e a página inicial.

### Variáveis

Geradas pelo Coolify (não preencher):

| Variável | Vai para |
|---|---|
| `SERVICE_URL_WEB_3000` | domínio do `web` |
| `SERVICE_USER_POSTGRES`, `SERVICE_PASSWORD_POSTGRES` | dono do banco: `postgres`, `migrar`, `backup` |
| `SERVICE_PASSWORD_64_PGSITE` | senha do papel `site`: `web` e `migrar` |

Preencher à mão quando for usar: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`,
`MP_WEBHOOK_SECRET`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`,
`EVOLUTION_INSTANCE`, `WHATSAPP_MSG_CONFIRMACAO_SIM`,
`WHATSAPP_MSG_CONFIRMACAO_NAO`, `WHATSAPP_MSG_PRESENTE_APROVADO`.

Opcionais: `POSTGRES_DB` (padrão `casamento`), `BACKUP_DIAS` (padrão 14).

⚠️ **Não trocar `SERVICE_PASSWORD_POSTGRES` nem `POSTGRES_DB`** depois do
primeiro deploy: a imagem do PostgreSQL só os lê ao criar o volume. A senha
do papel `site` pode ser trocada à vontade: o migrador a reaplica.

### Webhook do Mercado Pago

Painel do Mercado Pago → Suas integrações → aplicação → Webhooks:

- URL: `https://<domínio>/api/mercadopago/webhook`
- Evento: **Pagamentos**
- Copiar a assinatura secreta para `MP_WEBHOOK_SECRET` e fazer redeploy.

O webhook confere a assinatura `x-signature` antes de usar qualquer dado
(401 se inválida, 503 sem o segredo), usa do corpo só o id do pagamento,
lê status, valor e pedido no próprio Mercado Pago e não processa a mesma
notificação duas vezes.

## 5. Administradores

Só o dono do banco cria, pelo terminal do servidor:

```bash
docker exec -it postgres-<uuid> psql -U <dono> -d casamento
```

```sql
INSERT INTO administradores (nome, telefone) VALUES ('Lucas', '5583999999999');
UPDATE administradores SET ativo = false WHERE telefone = '5583999999999';
```

Telefone no formato `55` + DDD + número, só dígitos. O painel que usará esta
tabela ainda não existe.

## 6. Backup e restauração

O serviço `backup` faz `pg_dump --format=custom` ao iniciar e a cada 24 h
no volume `backups` (`casamento-<data>.dump`), guarda `BACKUP_DIAS` dias e
fica `unhealthy` se não houver dump das últimas 26 h.

⚠️ O volume fica no mesmo servidor: copiar para fora com frequência.

```bash
# backup na hora
docker restart $(docker ps -qf name=backup)

# restauração
B=$(docker ps -qf name=backup)
docker stop $(docker ps -qf name=web)
docker exec $B ls -t /backups
docker exec $B sh -c 'dropdb --force "$PGDATABASE" && createdb "$PGDATABASE" &&
  pg_restore --no-owner --no-privileges --exit-on-error \
    -d "$PGDATABASE" /backups/casamento-AAAAMMDDTHHMMSSZ.dump'
docker restart $(docker ps -qf name=migrar)   # reaplica as permissões do site
docker start $(docker ps -qf name=web)
```

Com mais de um recurso no servidor, filtrar pelo UUID (`name=backup-<uuid>`).

## 7. Pendências conhecidas

1. **Limite de envios da confirmação.** O PocketBase limitava cadastros por
   IP; hoje só há o campo-isca contra robôs. Um limite por IP exige confiar
   no `X-Forwarded-For` do proxy do Coolify.
2. **Checkout de presentes**: falta a página (vitrine, formulário,
   Card Payment Brick/Pix) e a rota de status do pedido para o Pix.
3. **Painel administrativo**: falta login (por exemplo, código pelo
   WhatsApp, como na Adriana Melo) e as telas.
4. **Cópia externa dos backups** (S3, outro servidor) ainda não existe.
5. **CSP**: os cabeçalhos de segurança básicos estão em `next.config.ts`; a
   Content-Security-Policy fica para quando o checkout definir as origens.
