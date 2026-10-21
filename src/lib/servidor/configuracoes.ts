import "server-only";
import { sql } from "drizzle-orm";
import { configuracoes } from "@/db/esquema";
import {
  CONFIGURACOES_PADRAO,
  mesclarConfiguracoes,
  type Configuracoes,
} from "@/lib/configuracoes";
import { banco, mensagemDoErro } from "./banco";

/**
 * Informações do site guardadas no banco. Se o banco falhar, a página
 * pública mostra os valores padrão em vez de quebrar.
 */
export async function lerConfiguracoes(): Promise<Configuracoes> {
  const db = await banco();
  try {
    const linhas = await db.select({ chave: configuracoes.chave, valor: configuracoes.valor }).from(configuracoes);
    return mesclarConfiguracoes(linhas);
  } catch (erro) {
    console.error("Configurações: banco indisponível, usando os padrões.", mensagemDoErro(erro));
    return { ...CONFIGURACOES_PADRAO };
  }
}

/** Grava todos os valores (já validados por validarConfiguracoes). */
export async function salvarConfiguracoes(valores: Configuracoes) {
  const db = await banco();
  await db
    .insert(configuracoes)
    .values(Object.entries(valores).map(([chave, valor]) => ({ chave, valor })))
    .onConflictDoUpdate({
      target: configuracoes.chave,
      set: { valor: sql`excluded.valor`, atualizadoEm: sql`now()` },
    });
}
