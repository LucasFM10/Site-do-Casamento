import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { administradores, sessoesAdmin } from "@/db/esquema";
import { banco } from "./banco";
import { excedeuLimite, registrarTentativa, zerarTentativas } from "./limites";

/**
 * Login e sessão do painel (/admin).
 *
 * Administradores existem só no banco, criados pelo dono (docs/banco-e-deploy.md).
 * A senha é conferida pelo próprio PostgreSQL (crypt do pgcrypto, bcrypt);
 * o site nunca vê nem guarda o hash fora da consulta.
 *
 * A sessão é um token aleatório num cookie httpOnly; o banco guarda só o
 * SHA-256 dele. Cada página e cada ação do painel chamam exigirAdmin(), que
 * confere a sessão e se o administrador continua ativo.
 */

const COOKIE = "__Host-sessao_admin";
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;

/** Erros seguidos por celular e por IP, em 15 minutos. */
const LIMITE_POR_TELEFONE = 5;
const LIMITE_POR_IP = 20;
const JANELA_MINUTOS = 15;

/**
 * Hash bcrypt de mentira, para a consulta custar o mesmo tempo quando o
 * celular não existe (não revela quem é administrador).
 */
const HASH_FICTICIO = "$2a$12$CasamentoLucasAmandaXXuSemSenhaUsuarioInexistente0000";

const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type Administrador = { id: string; nome: string };

export type ResultadoLogin = "ok" | "invalido" | "bloqueado";

export async function entrar(telefone: string, senha: string, ip: string): Promise<ResultadoLogin> {
  const chaveTelefone = `login:tel:${telefone}`;
  const chaveIp = `login:ip:${ip}`;
  if (
    (await excedeuLimite(chaveTelefone, LIMITE_POR_TELEFONE, JANELA_MINUTOS)) ||
    (await excedeuLimite(chaveIp, LIMITE_POR_IP, JANELA_MINUTOS))
  ) {
    return "bloqueado";
  }

  const db = await banco();
  // Um único crypt(), exista ou não o administrador.
  const [r] = await db.execute<{ id: string | null; ativo: boolean | null; temSenha: boolean; confere: boolean }>(sql`
    select a.id, a.ativo, a.senha_hash is not null as "temSenha",
      crypt(${senha}, coalesce(a.senha_hash, ${HASH_FICTICIO})) = coalesce(a.senha_hash, ${HASH_FICTICIO}) as confere
    from (select 1) as sempre
    left join ${administradores} a on a.telefone = ${telefone}
  `);

  if (!r?.id || r.ativo !== true || !r.temSenha || r.confere !== true) {
    await registrarTentativa(chaveTelefone);
    await registrarTentativa(chaveIp);
    return "invalido";
  }

  await zerarTentativas(chaveTelefone);
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  await db.delete(sessoesAdmin).where(lt(sessoesAdmin.expiraEm, new Date()));
  await db.insert(sessoesAdmin).values({ administradorId: r.id, tokenHash: hashDoToken(token), expiraEm });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
  return "ok";
}

/** Administrador da sessão atual, ou null. Uma consulta por requisição. */
export const sessaoAtual = cache(async (): Promise<Administrador | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await banco();
  const [r] = await db
    .select({ id: administradores.id, nome: administradores.nome })
    .from(sessoesAdmin)
    .innerJoin(administradores, eq(administradores.id, sessoesAdmin.administradorId))
    .where(
      and(
        eq(sessoesAdmin.tokenHash, hashDoToken(token)),
        gt(sessoesAdmin.expiraEm, new Date()),
        eq(administradores.ativo, true),
        isNotNull(administradores.senhaHash),
      ),
    );
  return r ?? null;
});

/** Para páginas e ações do painel: sem sessão válida, vai para o login. */
export async function exigirAdmin(): Promise<Administrador> {
  const admin = await sessaoAtual();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function sair() {
  const loja = await cookies();
  const token = loja.get(COOKIE)?.value;
  if (token) {
    const db = await banco();
    await db.delete(sessoesAdmin).where(eq(sessoesAdmin.tokenHash, hashDoToken(token)));
  }
  loja.delete({ name: COOKIE, path: "/", secure: true, httpOnly: true, sameSite: "lax" });
}
