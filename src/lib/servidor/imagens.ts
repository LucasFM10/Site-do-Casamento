import "server-only";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { imagens, MAX_BYTES_IMAGEM, TIPOS_IMAGEM } from "@/db/esquema";
import { banco, idValido, listaDeIds, mesmoConjunto } from "./banco";

/**
 * Imagens dos presentes e do carrossel, guardadas no banco. O navegador do
 * painel reduz a foto antes de enviar (src/components/admin/EnvioImagens.tsx);
 * aqui o tipo é conferido pelos primeiros bytes do arquivo, não pelo nome.
 */

export type TipoImagem = (typeof TIPOS_IMAGEM)[number];
export type Grupo = "presente" | "carrossel";

export type Imagem = { id: string; largura: number; altura: number };

/** Tipo real da imagem pelos primeiros bytes, ou null se não for JPEG, PNG ou WebP. */
export function tipoDaImagem(bytes: Uint8Array): TipoImagem | null {
  const comeca = (...b: number[]) => b.every((v, i) => bytes[i] === v);
  if (comeca(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (comeca(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const ascii = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export type ErroImagem = "tamanho" | "tipo" | "dimensoes";

export function validarImagem(
  bytes: Uint8Array,
  largura: number,
  altura: number,
): { ok: true; tipo: TipoImagem } | { ok: false; erro: ErroImagem } {
  if (bytes.length < 1 || bytes.length > MAX_BYTES_IMAGEM) return { ok: false, erro: "tamanho" };
  const tipo = tipoDaImagem(bytes);
  if (!tipo) return { ok: false, erro: "tipo" };
  const dimensaoOk = (n: number) => Number.isInteger(n) && n >= 1 && n <= 10_000;
  if (!dimensaoOk(largura) || !dimensaoOk(altura)) return { ok: false, erro: "dimensoes" };
  return { ok: true, tipo };
}

const doGrupo = (grupo: Grupo, presenteId: string | null) =>
  and(eq(imagens.grupo, grupo), presenteId ? eq(imagens.presenteId, presenteId) : isNull(imagens.presenteId));

export async function listarImagens(grupo: Grupo, presenteId: string | null = null): Promise<Imagem[]> {
  const db = await banco();
  return db
    .select({ id: imagens.id, largura: imagens.largura, altura: imagens.altura })
    .from(imagens)
    .where(doGrupo(grupo, presenteId))
    .orderBy(asc(imagens.ordem), asc(imagens.criadoEm));
}

export async function guardarImagem(dados: {
  grupo: Grupo;
  presenteId: string | null;
  bytes: Buffer;
  tipo: TipoImagem;
  largura: number;
  altura: number;
}) {
  const db = await banco();
  const [{ ultima }] = await db
    .select({ ultima: max(imagens.ordem) })
    .from(imagens)
    .where(doGrupo(dados.grupo, dados.presenteId));
  const [r] = await db
    .insert(imagens)
    .values({
      grupo: dados.grupo,
      presenteId: dados.presenteId,
      ordem: ultima === null ? 0 : ultima + 1,
      tipo: dados.tipo,
      largura: dados.largura,
      altura: dados.altura,
      dados: dados.bytes,
    })
    .returning({ id: imagens.id });
  return r.id;
}

export async function apagarImagem(id: string) {
  if (!idValido(id)) return;
  const db = await banco();
  await db.delete(imagens).where(eq(imagens.id, id));
}

/** Grava a ordem das fotos de um grupo; só aceita todas as fotos do grupo, sem repetição. */
export async function reordenarImagens(ids: unknown): Promise<boolean> {
  if (!listaDeIds(ids) || ids.length === 0) return false;
  const db = await banco();
  return db.transaction(async (tx) => {
    const [alvo] = await tx
      .select({ grupo: imagens.grupo, presenteId: imagens.presenteId })
      .from(imagens)
      .where(eq(imagens.id, ids[0]));
    if (!alvo) return false;
    const lista = await tx
      .select({ id: imagens.id, ordem: imagens.ordem })
      .from(imagens)
      .where(doGrupo(alvo.grupo, alvo.presenteId))
      .for("update");
    if (!mesmoConjunto(lista.map((i) => i.id), ids)) return false;
    for (const [ordem, imagemId] of ids.entries()) {
      if (lista.find((i) => i.id === imagemId)?.ordem !== ordem) {
        await tx.update(imagens).set({ ordem }).where(eq(imagens.id, imagemId));
      }
    }
    return true;
  });
}

/** Conteúdo para a rota /api/imagens/[id]. */
export async function lerImagem(id: string) {
  if (!idValido(id)) return null;
  const db = await banco();
  const [r] = await db.select({ tipo: imagens.tipo, dados: imagens.dados }).from(imagens).where(eq(imagens.id, id));
  return r ?? null;
}

/** Primeira imagem de cada presente (para as listas). */
export async function capasDosPresentes(): Promise<Map<string, Imagem>> {
  const db = await banco();
  const linhas = await db
    .selectDistinctOn([imagens.presenteId], {
      presenteId: imagens.presenteId,
      id: imagens.id,
      largura: imagens.largura,
      altura: imagens.altura,
    })
    .from(imagens)
    .where(eq(imagens.grupo, "presente"))
    .orderBy(imagens.presenteId, asc(imagens.ordem), asc(imagens.criadoEm));
  return new Map(linhas.map(({ presenteId, ...img }) => [presenteId!, img]));
}

export const urlDaImagem = (id: string) => `/api/imagens/${id}`;
