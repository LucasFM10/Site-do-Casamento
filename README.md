# Projeto Casamento - Lucas & Amanda

Site do casamento de Lucas e Amanda com informações da cerimônia, confirmação individual de presença e lista de presentes.

## Funcionalidades

- Carrossel de fotos e contador regressivo.
- Modal com horário e locais do casamento.
- Confirmação individual de presença, incluindo respostas positivas e negativas.
- Modal da lista de presentes com aviso de disponibilidade futura.
- Consulta das confirmações pelo Dashboard do PocketBase.

## Arquitetura

- Next.js 14, React, Tailwind CSS e shadcn/ui.
- PocketBase 0.40.5 com migrations versionadas.
- Docker Compose com serviços `web` e `pocketbase`.
- Volume `pocketbase-data` para persistência do SQLite.

O Next.js envia as confirmações ao PocketBase pela rede interna do Compose. Convidados podem apenas criar uma confirmação válida; leitura, alteração e exclusão públicas ficam bloqueadas.

## Execução local com Docker

1. Copie `.env.example` para `.env` e troque as credenciais de exemplo. `PB_ENCRYPTION_KEY` deve ter exatamente 32 caracteres.
2. Se a porta `8090` já estiver ocupada, altere `POCKETBASE_PORT` no `.env`.
3. Inicie a stack:

```sh
node scripts/dev-docker.mjs
```

Acesse:

- Site: `http://localhost:3000`
- Dashboard PocketBase: `http://localhost:8090/_/` ou a porta definida em `POCKETBASE_PORT`.

As dependências do frontend permanecem no volume Docker `web-node-modules`. Não é necessário executar `npm install` ou manter `node_modules` na máquina. Alterações no código são refletidas pelo servidor de desenvolvimento.

Para parar os containers sem apagar os dados:

```sh
docker compose -f compose.yaml -f compose.local.yaml -f compose.dev.yaml down
```

Não use `down -v` em um ambiente com dados que deseja preservar, pois esse comando remove o volume do PocketBase.

## Desenvolvimento do frontend sem container

Com o PocketBase local em execução:

```sh
npm install
$env:POCKETBASE_URL="http://127.0.0.1:8090"
npm run dev
```

## Deploy no Coolify

Crie um recurso Docker Compose apontando para `compose.yaml` e configure como secrets:

- `PB_SUPERUSER_EMAIL`: e-mail do Dashboard do PocketBase.
- `PB_SUPERUSER_PASSWORD`: senha forte e exclusiva para o Dashboard.
- `PB_ENCRYPTION_KEY`: valor aleatório com exatamente 32 caracteres; mantenha-o estável.
- `PB_GOMEMLIMIT` (opcional, padrão `256MiB`).

Associe o domínio público ao serviço `web`, porta `3000`. O serviço `pocketbase`, porta `8090`, deve permanecer na rede interna para o funcionamento do site. Se expuser o Dashboard, proteja o domínio no proxy do Coolify. O superusuário é criado ou atualizado em cada inicialização a partir dos secrets.

O volume `pocketbase-data` deve permanecer persistente. Configure backups regulares pelo PocketBase ou pelo provedor.

## Banco de dados e segurança

As migrations em `pocketbase/pb_migrations` são aplicadas automaticamente. A coleção `confirmacoes` armazena:

- `nome_completo`: texto obrigatório entre 3 e 120 caracteres.
- `celular`: 10 ou 11 dígitos, incluindo DDD.
- `resposta`: `sim` ou `nao`.
- `created` e `updated`: datas automáticas.

A coleção permite criação pública validada, mas bloqueia listagem, leitura individual, atualização e exclusão para convidados. O PocketBase aplica rate limiting aos cadastros. As respostas podem ser consultadas por um superusuário no Dashboard.

## Verificações

```sh
npm run test
npm run build
docker compose --env-file .env -f compose.yaml config --quiet
```
