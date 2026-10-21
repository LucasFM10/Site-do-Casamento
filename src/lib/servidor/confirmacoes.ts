import "server-only";
import { asc } from "drizzle-orm";
import { confirmacoes } from "@/db/esquema";
import { consolidarConfirmacoes } from "@/lib/confirmacoes";
import { banco } from "./banco";

/** Todos os convidados que responderam, com a resposta mais recente de cada um. */
export async function listarConvidados() {
  const db = await banco();
  const linhas = await db
    .select({
      id: confirmacoes.id,
      nomeCompleto: confirmacoes.nomeCompleto,
      telefone: confirmacoes.telefone,
      resposta: confirmacoes.resposta,
      criadoEm: confirmacoes.criadoEm,
    })
    .from(confirmacoes)
    .orderBy(asc(confirmacoes.criadoEm));
  return consolidarConfirmacoes(linhas);
}
