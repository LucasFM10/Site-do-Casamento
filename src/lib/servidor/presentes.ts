import "server-only";
import { and, asc, count, eq, isNull, max, sql } from "drizzle-orm";
import { pedidos, presentes } from "@/db/esquema";
import type { DadosPresente } from "@/lib/presentes";
import { banco, idValido, listaDeIds, mesmoConjunto } from "./banco";
import { capasDosPresentes, listarImagens, type Imagem } from "./imagens";

/**
 * Catálogo da lista de presentes: vitrine pública e cadastro pelo painel.
 *
 * Um presente com quantidade máxima esgota quando os pedidos aprovados mais
 * os Pix ainda dentro da validade chegam ao limite (o Pix em aberto segura
 * a unidade enquanto pode ser pago).
 */

/** Validade do QR do Pix (VALIDADE_PIX_MINUTOS, em pedidos.ts) mais um minuto de folga. */
export const RESERVA_PIX_MINUTOS = 32;

// Nas subconsultas abaixo, o presente vai escrito como "presentes"."id": o
// Drizzle escreveria só "id", que dentro da subconsulta seria o id do pedido.

/** Unidades já dadas ou seguradas por um Pix em aberto. */
export const reservadosSql = sql<number>`(
  select count(*)::int from ${pedidos} pd
  where pd.presente_id = "presentes"."id"
    and (pd.status = 'aprovado'
      or (pd.status = 'pendente' and pd.criado_em > now() - make_interval(mins => ${RESERVA_PIX_MINUTOS})))
)`;

const aprovadosSql = sql<number>`(
  select count(*)::int from ${pedidos} pd where pd.presente_id = "presentes"."id" and pd.status = 'aprovado'
)`;

const arrecadadoSql = sql<number>`(
  select coalesce(sum(pd.valor_centavos), 0)::int from ${pedidos} pd
  where pd.presente_id = "presentes"."id" and pd.status = 'aprovado'
)`;

export function estaEsgotado(quantidadeMaxima: number | null, reservados: number) {
  return quantidadeMaxima !== null && reservados >= quantidadeMaxima;
}

const naVitrine = and(eq(presentes.ativo, true), isNull(presentes.removidoEm));
const naoRemovido = isNull(presentes.removidoEm);

export type ItemVitrine = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  esgotado: boolean;
  capa: Imagem | null;
};

export async function listarVitrine(): Promise<ItemVitrine[]> {
  const db = await banco();
  const [linhas, capas] = await Promise.all([
    db
      .select({
        id: presentes.id,
        nome: presentes.nome,
        descricao: presentes.descricao,
        precoCentavos: presentes.precoCentavos,
        quantidadeMaxima: presentes.quantidadeMaxima,
        reservados: reservadosSql,
      })
      .from(presentes)
      .where(naVitrine)
      .orderBy(asc(presentes.ordem), asc(presentes.criadoEm)),
    capasDosPresentes(),
  ]);
  return linhas.map(({ quantidadeMaxima, reservados, ...p }) => ({
    ...p,
    esgotado: estaEsgotado(quantidadeMaxima, reservados),
    capa: capas.get(p.id) ?? null,
  }));
}

export async function obterPresentePublico(id: string) {
  if (!idValido(id)) return null;
  const db = await banco();
  const [p] = await db
    .select({
      id: presentes.id,
      nome: presentes.nome,
      descricao: presentes.descricao,
      precoCentavos: presentes.precoCentavos,
      quantidadeMaxima: presentes.quantidadeMaxima,
      reservados: reservadosSql,
    })
    .from(presentes)
    .where(and(eq(presentes.id, id), naVitrine));
  if (!p) return null;
  const { quantidadeMaxima, reservados, ...resto } = p;
  return {
    ...resto,
    esgotado: estaEsgotado(quantidadeMaxima, reservados),
    imagens: await listarImagens("presente", p.id),
  };
}

// --- Painel --------------------------------------------------------------

export async function listarPresentesAdmin() {
  const db = await banco();
  const [linhas, capas] = await Promise.all([
    db
      .select({
        id: presentes.id,
        nome: presentes.nome,
        precoCentavos: presentes.precoCentavos,
        ativo: presentes.ativo,
        quantidadeMaxima: presentes.quantidadeMaxima,
        reservados: reservadosSql,
        aprovados: aprovadosSql,
        arrecadadoCentavos: arrecadadoSql,
      })
      .from(presentes)
      .where(naoRemovido)
      .orderBy(asc(presentes.ordem), asc(presentes.criadoEm)),
    capasDosPresentes(),
  ]);
  return linhas.map((p) => ({
    ...p,
    esgotado: estaEsgotado(p.quantidadeMaxima, p.reservados),
    capa: capas.get(p.id) ?? null,
  }));
}

export async function obterPresenteAdmin(id: string) {
  if (!idValido(id)) return null;
  const db = await banco();
  const [p] = await db
    .select({
      id: presentes.id,
      nome: presentes.nome,
      descricao: presentes.descricao,
      precoCentavos: presentes.precoCentavos,
      ativo: presentes.ativo,
      quantidadeMaxima: presentes.quantidadeMaxima,
      aprovados: aprovadosSql,
    })
    .from(presentes)
    .where(and(eq(presentes.id, id), naoRemovido));
  return p ?? null;
}

export async function criarPresente(dados: DadosPresente) {
  const db = await banco();
  const [{ ultima }] = await db.select({ ultima: max(presentes.ordem) }).from(presentes).where(naoRemovido);
  const [r] = await db
    .insert(presentes)
    .values({ ...dados, ordem: ultima === null ? 0 : ultima + 1 })
    .returning({ id: presentes.id });
  return r.id;
}

export async function atualizarPresente(id: string, dados: DadosPresente) {
  if (!idValido(id)) return false;
  const db = await banco();
  const r = await db
    .update(presentes)
    .set(dados)
    .where(and(eq(presentes.id, id), naoRemovido))
    .returning({ id: presentes.id });
  return r.length > 0;
}

export async function definirAtivo(id: string, ativo: boolean) {
  if (!idValido(id)) return;
  const db = await banco();
  await db.update(presentes).set({ ativo }).where(and(eq(presentes.id, id), naoRemovido));
}

/**
 * Sem pedidos, o presente é apagado (com as imagens). Com pedidos, fica no
 * banco para o histórico das compras, mas some do site e do painel.
 */
export async function removerPresente(id: string): Promise<"apagado" | "arquivado" | null> {
  if (!idValido(id)) return null;
  const db = await banco();
  return db.transaction(async (tx) => {
    const [p] = await tx
      .select({ id: presentes.id })
      .from(presentes)
      .where(and(eq(presentes.id, id), naoRemovido))
      .for("update");
    if (!p) return null;
    const [{ total }] = await tx.select({ total: count() }).from(pedidos).where(eq(pedidos.presenteId, id));
    if (total === 0) {
      await tx.delete(presentes).where(eq(presentes.id, id));
      return "apagado";
    }
    await tx.update(presentes).set({ ativo: false, removidoEm: new Date() }).where(eq(presentes.id, id));
    return "arquivado";
  });
}

/**
 * Grava a ordem da lista arrastada no painel. Só aceita a lista completa
 * e sem repetição dos presentes atuais; qualquer outra coisa é ignorada.
 */
export async function reordenarPresentes(ids: unknown): Promise<boolean> {
  if (!listaDeIds(ids)) return false;
  const db = await banco();
  return db.transaction(async (tx) => {
    const lista = await tx
      .select({ id: presentes.id, ordem: presentes.ordem })
      .from(presentes)
      .where(naoRemovido)
      .for("update");
    if (!mesmoConjunto(lista.map((p) => p.id), ids)) return false;
    for (const [ordem, presenteId] of ids.entries()) {
      if (lista.find((p) => p.id === presenteId)?.ordem !== ordem) {
        await tx.update(presentes).set({ ordem }).where(eq(presentes.id, presenteId));
      }
    }
    return true;
  });
}
