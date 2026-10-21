# Banco de dados e deploy

Guia do PostgreSQL + Drizzle e do deploy no Coolify. A arquitetura é a
mesma do projeto Adriana Melo, simplificada para o site do casamento.

## 1. Arquitetura

| Serviço | Papel |
|---|---|
| `web` | Next.js 16: site, lista de presentes, painel (`/admin`), webhook. Único com domínio |
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
zero**, tabela por tabela, conforme `scripts/permissoes.ts`:

| Tabela | O site pode |
|---|---|
| `confirmacoes` | ler e inserir (nunca alterar nem apagar) |
| `pedidos` | ler, inserir e alterar só status, id do pagamento e `atualizado_em` |
| `webhook_eventos` | ler, inserir e marcar `processado_em` |
| `presentes` | ler, inserir, editar os dados do catálogo e apagar presente **sem** pedidos |
| `imagens` | ler, inserir, apagar e mudar a ordem |
| `configuracoes` | ler, inserir e alterar o valor |
| `sessoes_admin`, `limite_tentativas` | ler, inserir e apagar |
| `administradores` | **só ler** |

Pedido criado pelo site nasce `pendente` (gatilho da migração `0001`). O
site não lê o esquema `drizzle`, não cria tabelas e não cria nem altera
administradores. As escritas no catálogo, nas imagens e nas configurações
só acontecem por ações do painel, que conferem a sessão de administrador no
servidor. Testado em `tests/banco/permissoes.test.mjs`.

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

Preencher à mão quando for usar: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
`MP_PUBLIC_KEY` (só para um futuro checkout com cartão), `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`,
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

O painel fica em `https://<domínio>/admin` (sem link no site). Entra-se com
o celular e a senha. Não há cadastro, troca de senha nem promoção de usuário
pela interface: contas são criadas, alteradas e removidas **só pelo dono do
banco**, pelo terminal do servidor:

```bash
docker exec -it postgres-<uuid> psql -U <dono> -d casamento
```

```sql
-- Criar (o hash bcrypt é gerado pelo próprio PostgreSQL, extensão pgcrypto)
INSERT INTO administradores (nome, telefone, senha_hash)
VALUES ('Lucas', '5583999999999', crypt('uma-senha-forte', gen_salt('bf', 12)));

-- Trocar a senha
UPDATE administradores SET senha_hash = crypt('nova-senha-forte', gen_salt('bf', 12))
WHERE telefone = '5583999999999';

-- Desativar (encerra o acesso na hora, mesmo com sessão aberta) ou remover
UPDATE administradores SET ativo = false WHERE telefone = '5583999999999';
DELETE FROM administradores WHERE telefone = '5583999999999';

-- Encerrar todas as sessões abertas
DELETE FROM sessoes_admin;
```

Telefone no formato `55` + DDD + número, só dígitos. Use sempre
`gen_salt('bf', 12)`: o padrão do `gen_salt('bf')` é fraco. A senha digitada
no psql fica no histórico (`~/.psql_history` dentro do container); para
evitar, rode `\set HISTFILE /dev/null` antes, ou apague o histórico depois.

Segurança do login: a senha é conferida no PostgreSQL (`crypt`), com o mesmo
custo exista ou não o celular; a sessão dura 7 dias, num cookie `httpOnly`,
`Secure` e `SameSite=Lax` (o banco guarda só o SHA-256 do token); depois de
5 erros seguidos para um celular, ou 20 de um mesmo IP, o login fica
bloqueado por 15 minutos. Cada página e cada ação do painel conferem a sessão
no servidor.

## 5.1 Limites contra abuso

Guardados em `limite_tentativas`, por IP (o último endereço de
`X-Forwarded-For`, que o proxy do Coolify preenche):

| O quê | Limite |
|---|---|
| Login errado | 5 por celular e 20 por IP em 15 min |
| Pix gerado | 10 por IP por hora |
| Confirmação de presença | 30 por IP por hora |

Se o site ficar atrás de outro proxy ou CDN (Cloudflare, por exemplo), o
último endereço passa a ser o do CDN: os limites continuam valendo, mas por
servidor do CDN, não por visitante.

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

1. **Cópia externa dos backups** (S3, outro servidor) ainda não existe. As
   fotos enviadas pelo painel também ficam no banco, então entram no mesmo
   backup.
2. **CSP**: os cabeçalhos de segurança básicos estão em `next.config.ts`. O
   checkout por Pix não carrega scripts de terceiros, então a
   Content-Security-Policy pode ser definida; ficou para um passo próprio,
   com teste em produção.
3. **Cartão de crédito**: `pagarComCartao` existe no servidor, mas não há
   página (exigiria o Card Payment Brick e a `MP_PUBLIC_KEY`).
4. **Coluna `presentes.imagem_url`**: legado, não é mais usada (as fotos
   ficam em `imagens`). Remover numa migração futura.
