import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { limiteTentativas } from "@/db/esquema";
import { banco } from "./banco";

/**
 * Limite de tentativas por chave numa janela de tempo, guardado no banco
 * (vale entre reinícios do site). Usado no login do painel, na geração de
 * Pix e na confirmação de presença.
 */

const desde = (minutos: number) => new Date(Date.now() - minutos * 60_000);

/** Quantas tentativas a chave tem na janela. */
async function contar(chave: string, janelaMinutos: number) {
  const db = await banco();
  const [r] = await db
    .select({ total: count() })
    .from(limiteTentativas)
    .where(and(eq(limiteTentativas.chave, chave), gt(limiteTentativas.criadoEm, desde(janelaMinutos))));
  return r?.total ?? 0;
}

export async function excedeuLimite(chave: string, maximo: number, janelaMinutos: number) {
  return (await contar(chave, janelaMinutos)) >= maximo;
}

export async function registrarTentativa(chave: string) {
  const db = await banco();
  await db.insert(limiteTentativas).values({ chave });
  // De vez em quando, apaga o que já passou de um dia.
  if (Math.random() < 0.05) {
    await db.delete(limiteTentativas).where(lt(limiteTentativas.criadoEm, desde(24 * 60)));
  }
}

/** Conta uma tentativa se ainda couber no limite. false: limite atingido. */
export async function consumirLimite(chave: string, maximo: number, janelaMinutos: number) {
  if (await excedeuLimite(chave, maximo, janelaMinutos)) return false;
  await registrarTentativa(chave);
  return true;
}

export async function zerarTentativas(chave: string) {
  const db = await banco();
  await db.delete(limiteTentativas).where(eq(limiteTentativas.chave, chave));
}
