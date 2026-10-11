# Projeto Casamento — Lucas & Amanda

Site para celebração do Sacramento do Matrimônio de Lucas e Amanda.

## Funcionalidades

- Carrossel de fotos e contador regressivo.
- Corrente de oração com contador de terços.
- Envio opcional de foto, armazenada de forma protegida.
- Login e painel administrativo para leitura das intenções.

## Arquitetura

- Next.js 14, React, Tailwind CSS e shadcn/ui.
- PocketBase 0.40.5 com migrations versionadas.
- Docker Compose com serviços `web` e `pocketbase`.
- Volume `pocketbase-data` para o SQLite e os uploads.

O Next.js acessa o PocketBase pela rede interna do Compose. Fotos privadas são entregues pelo próprio Next.js após validação do login administrativo; o navegador não recebe credenciais do PocketBase.

## Execução local com Docker

1. Copie `.env.example` para `.env` e troque as credenciais de exemplo. `PB_ENCRYPTION_KEY` deve ter exatamente 32 caracteres.
2. Inicie a stack com as portas locais:

```sh
docker compose -f compose.yaml -f compose.local.yaml up --build -d
```

3. Acesse:

- Site: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Dashboard PocketBase: `http://localhost:8090/_/`

Na primeira inicialização, a migration cria o schema. Para liberar o acesso a `/login`, entre no Dashboard com o `PB_SUPERUSER`, abra a coleção `admins` e crie o administrador do site com e-mail e senha. Essa conta é independente do superusuário do PocketBase.

Para parar os containers sem apagar os dados:

```sh
docker compose -f compose.yaml -f compose.local.yaml down
```

Não use `down -v` em um ambiente com dados que deseja preservar, pois esse comando remove o volume do PocketBase.

## Desenvolvimento do frontend sem container

Com o PocketBase local em execução:

```sh
npm install
$env:POCKETBASE_URL="http://127.0.0.1:8090"
$env:AUTH_COOKIE_SECURE="false"
npm run dev
```

## Desenvolvimento com Docker (sem `node_modules` local)

Com Docker Desktop e Node.js instalados, copie `.env.example` para `.env`, preencha os secrets e execute:

```sh
node scripts/dev-docker.mjs
```

Ou, de forma equivalente:

```sh
npm run dev:docker
```

O script inicia `web` e `pocketbase` em modo de desenvolvimento. O código local é sincronizado para o container e o Next.js atualiza a página ao salvar arquivos. As dependências ficam no volume Docker `web-node-modules`: não é necessário executar `npm install` nem manter `node_modules` na máquina. Se `package-lock.json` mudar, o container atualiza esse volume automaticamente. Use `Ctrl+C` para encerrar os logs e os containers; os dados e volumes permanecem preservados.

## Deploy no Coolify

Crie um recurso Docker Compose apontando para `compose.yaml` e configure, como secrets, estas variáveis:

- `PB_SUPERUSER_EMAIL`: e-mail do Dashboard do PocketBase.
- `PB_SUPERUSER_PASSWORD`: senha forte e exclusiva para o Dashboard do PocketBase.
- `PB_ENCRYPTION_KEY`: valor aleatório com exatamente 32 caracteres; mantenha-o estável.
- `AUTH_COOKIE_SECURE=true`.
- `PB_GOMEMLIMIT` (opcional, padrão `256MiB`).

Associe o domínio público principal ao serviço `web`, porta `3000`. O serviço `pocketbase`, porta `8090`, não precisa de domínio para o funcionamento do site e deve permanecer apenas na rede interna. Se optar por expor o Dashboard do PocketBase, proteja esse domínio no proxy do Coolify. O superusuário é criado ou atualizado em cada inicialização a partir dos secrets `PB_SUPERUSER_EMAIL` e `PB_SUPERUSER_PASSWORD`.

Após o primeiro acesso ao Dashboard, abra **Collections** → **admins** → **New record** para criar cada conta que poderá entrar em `/login`. Não há cadastro público para essa coleção. A criação e a troca de senha dessas contas são feitas pelo Dashboard, sem variáveis `PB_ADMIN_*`.

O volume `pocketbase-data` precisa permanecer persistente. Configure backups regulares pelo PocketBase ou pelo recurso de backup de volumes do provedor.

## Migrations e segurança

As migrations em `pocketbase/pb_migrations` são aplicadas automaticamente pelo PocketBase ao iniciar. O schema possui:

- `admins`: coleção de autenticação sem cadastro público; usuários são geridos pelo Dashboard do PocketBase.
- `tercos`: criação pública, mas leitura e alteração somente para administradores.
- `tercos_total`: view pública que expõe apenas a soma, sem nomes, intenções ou arquivos.

O PocketBase usa rate limiting, arquivos protegidos, validação de tamanho/tipo das imagens e criptografia das configurações via `PB_ENCRYPTION_KEY`.

## Verificações

```sh
npm run build
docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.local.yaml up --build -d
docker compose --env-file .env -f compose.yaml -f compose.local.yaml ps
```
