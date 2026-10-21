import type { Sql } from "postgres";

/**
 * Permissões do papel do site no PostgreSQL (menor privilégio).
 *
 * O site lê todas as tabelas da aplicação e só escreve o que o código usa.
 * Tudo o que não está aqui é negado: o site não cria nem altera tabelas, não
 * lê o controle de migrações (esquema `drizzle`), não cria nem altera
 * administradores, não apaga confirmação nem pedido e não muda valor,
 * presente ou comprador de pedido já gravado. A trava de criação (pedido
 * nasce pendente) está no gatilho da migração 0001.
 *
 * Aplicadas pelo migrador a cada deploy, a partir do zero: o que sair desta
 * lista deixa de valer no deploy seguinte. Tabela nova sem entrada aqui faz o
 * migrador parar com erro.
 */
type Permissao = {
  inserir?: boolean;
  apagar?: boolean;
  /** Colunas que o site pode alterar. */
  atualizar?: string[];
};

export const PERMISSOES: Record<string, Permissao> = {
  confirmacoes: { inserir: true },
  // Administradores só pelo dono do banco.
  administradores: {},
  presentes: {},
  pedidos: { inserir: true, atualizar: ["status", "mp_payment_id", "atualizado_em"] },
  webhook_eventos: { inserir: true, atualizar: ["processado_em"] },
};

const PAPEL_VALIDO = /^[a-z_][a-z0-9_]{0,62}$/;

/**
 * Cria (ou ajusta) o papel do site com a senha do ambiente e aplica as
 * permissões. Roda com o dono do banco, numa transação: ou tudo vale, ou nada.
 */
export async function aplicarPermissoes(sql: Sql, papel: string, senha: string) {
  if (!PAPEL_VALIDO.test(papel)) throw new Error("PGUSER inválido para o papel do site.");
  if (senha.length < 16) throw new Error("PGPASSWORD do site precisa ter pelo menos 16 caracteres.");

  await sql.begin(async (tx) => {
    const [{ dono }] = await tx`select current_user as dono`;
    if (dono === papel) {
      throw new Error("O papel do site (PGUSER) não pode ser o dono do banco (POSTGRES_USER).");
    }

    const [existe] = await tx`select 1 from pg_roles where rolname = ${papel}`;
    if (!existe) await tx`create role ${tx(papel)}`;
    // A senha vai como literal montado pelo próprio PostgreSQL (format %L).
    const [{ comando }] = await tx`
      select format(
        'alter role %I with login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls connection limit 30 password %L',
        ${papel}::text, ${senha}::text
      ) as comando`;
    await tx.unsafe(comando);

    const [{ banco }] = await tx`select current_database() as banco`;
    await tx`revoke all on database ${tx(banco)} from public`;
    await tx`grant connect on database ${tx(banco)} to ${tx(papel)}`;
    await tx`revoke all on schema public from public`;
    await tx`grant usage on schema public to ${tx(papel)}`;
    await tx`revoke all on all tables in schema public from ${tx(papel)}`;
    await tx`revoke all on all sequences in schema public from ${tx(papel)}`;
    const [drizzle] = await tx`select 1 from pg_namespace where nspname = 'drizzle'`;
    if (drizzle) await tx`revoke all on schema drizzle from ${tx(papel)}`;

    const tabelas = await tx<{ nome: string }[]>`
      select tablename as nome from pg_tables where schemaname = 'public' order by 1`;
    const semRegra = tabelas.map((t) => t.nome).filter((t) => !(t in PERMISSOES));
    if (semRegra.length > 0) {
      throw new Error(`Tabelas sem permissões definidas em scripts/permissoes.ts: ${semRegra.join(", ")}.`);
    }

    for (const { nome } of tabelas) {
      const p = PERMISSOES[nome];
      await tx`grant select on ${tx(nome)} to ${tx(papel)}`;
      if (p.inserir) await tx`grant insert on ${tx(nome)} to ${tx(papel)}`;
      if (p.apagar) await tx`grant delete on ${tx(nome)} to ${tx(papel)}`;
      if (p.atualizar?.length) {
        await tx`grant update (${tx(p.atualizar)}) on ${tx(nome)} to ${tx(papel)}`;
      }
    }
  });
}
