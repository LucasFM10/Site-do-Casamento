/**
 * Migrador do banco. Roda antes do site, a cada deploy (serviço `migrar` do
 * docker-compose.yaml) ou à mão (`npm run db:migrar`). Em ordem:
 *
 * 1. aplica as migrações de drizzle/ que ainda não rodaram;
 * 2. cria ou ajusta o papel do site (PGUSER/PGPASSWORD) e as permissões
 *    dele (scripts/permissoes.ts).
 *
 * Entra como dono do banco (POSTGRES_USER/POSTGRES_PASSWORD). O site nunca
 * recebe essas credenciais. Nenhuma senha vai para o log.
 *
 * Empacotado com esbuild em dist/migrar.cjs (`npm run db:empacotar`), para
 * rodar só com o Node, sem node_modules.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { aplicarPermissoes } from "./permissoes";

function exigir(nome: string) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida.`);
  return valor;
}

async function aguardarBanco(sql: postgres.Sql) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      await sql`select 1`;
      return;
    } catch (erro) {
      if (tentativa >= 30) throw erro;
      console.log(`Banco ainda indisponível (${(erro as Error).message}); nova tentativa em 2 s.`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function conectar() {
  return postgres({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    database: exigir("PGDATABASE"),
    username: exigir("POSTGRES_USER"),
    password: exigir("POSTGRES_PASSWORD"),
    max: 1,
    onnotice: () => {},
  });
}

async function main() {
  // Uma conexão só: o bloqueio abaixo vale para a sessão inteira.
  const sql = conectar();
  try {
    await aguardarBanco(sql);
    // Dois migradores ao mesmo tempo esperam um pelo outro.
    await sql`select pg_advisory_lock(hashtext('casamento:migrar'))`;

    // O Drizzle troca os conversores de data do cliente que recebe: as
    // migrações usam uma conexão própria.
    const paraMigracoes = conectar();
    try {
      await migrate(drizzle(paraMigracoes), {
        migrationsFolder: process.env.MIGRACOES_DIR ?? "drizzle",
      });
    } finally {
      await paraMigracoes.end({ timeout: 5 });
    }
    console.log("Migrações aplicadas.");

    const papel = exigir("PGUSER");
    await aplicarPermissoes(sql, papel, exigir("PGPASSWORD"));
    console.log(`Permissões do papel do site (${papel}) aplicadas.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((erro) => {
  console.error("Migração falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
