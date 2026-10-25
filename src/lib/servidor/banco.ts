import "server-only";
import { connection } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as esquema from "@/db/esquema";
import { exigirEnv } from "./env";

/**
 * Acesso do site ao PostgreSQL. Só o servidor do site fala com o banco, pela
 * rede interna do Docker.
 *
 * O site entra com o papel próprio dele (PGUSER/PGPASSWORD), criado pelo
 * migrador com permissões mínimas (scripts/permissoes.ts). Não é o dono do
 * banco: não altera tabelas, não cria administrador, não apaga pedido. A
 * credencial nunca sai do servidor nem vai para log.
 */

function criar() {
  const cliente = postgres({
    host: exigirEnv("PGHOST"),
    port: Number(process.env.PGPORT ?? 5432),
    database: exigirEnv("PGDATABASE"),
    username: exigirEnv("PGUSER"),
    password: exigirEnv("PGPASSWORD"),
    max: 10,
    idle_timeout: 60,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return drizzle(cliente, { schema: esquema });
}

export type Banco = ReturnType<typeof criar>;

// Uma conexão compartilhada por processo (o recarregamento do `next dev`
// reaproveita a mesma).
const global = globalThis as typeof globalThis & { __bancoSite?: Banco };

/** Cliente do banco. Dados do banco são sempre da requisição: nunca entram no prerender. */
export async function banco(): Promise<Banco> {
  await connection();
  global.__bancoSite ??= criar();
  return global.__bancoSite;
}

/**
 * Mensagem do erro para log. O erro do Drizzle repete a consulta e os
 * parâmetros; o log leva só a causa do PostgreSQL (ou da conexão).
 */
export function mensagemDoErro(erro: unknown) {
  const e = erro as { message?: string; cause?: { message?: string } };
  return e?.cause?.message ?? e?.message ?? String(erro);
}

export function idValido(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
}

/** Lista de ids vinda do navegador para reordenar: ids válidos, sem repetição e de tamanho razoável. */
export function listaDeIds(ids: unknown): ids is string[] {
  return Array.isArray(ids) && ids.length <= 500 && ids.every(idValido) && new Set(ids).size === ids.length;
}

/** A lista nova tem exatamente os mesmos itens da atual (só a ordem muda). */
export function mesmoConjunto(atuais: string[], novos: string[]) {
  const conjunto = new Set(atuais);
  return atuais.length === novos.length && novos.every((id) => conjunto.has(id));
}
