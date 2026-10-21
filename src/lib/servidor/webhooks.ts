import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { webhookEventos } from "@/db/esquema";
import { banco } from "./banco";

/**
 * Registro das notificações recebidas, para não processar duas vezes a
 * mesma. Um evento só conta como feito depois de processado: se o
 * processamento falhar, a próxima tentativa do remetente processa de novo.
 */

type Evento = { origem: string; eventoId: string; tipo: string; recursoId: string };

/** "novo" se ainda precisa ser processado; "repetido" se já foi. */
export async function registrarEvento(evento: Evento): Promise<"novo" | "repetido"> {
  const db = await banco();
  await db
    .insert(webhookEventos)
    .values(evento)
    .onConflictDoNothing({ target: [webhookEventos.origem, webhookEventos.eventoId] });
  const [r] = await db
    .select({ processadoEm: webhookEventos.processadoEm })
    .from(webhookEventos)
    .where(and(eq(webhookEventos.origem, evento.origem), eq(webhookEventos.eventoId, evento.eventoId)));
  return r?.processadoEm ? "repetido" : "novo";
}

export async function concluirEvento(origem: string, eventoId: string) {
  const db = await banco();
  await db
    .update(webhookEventos)
    .set({ processadoEm: new Date() })
    .where(
      and(
        eq(webhookEventos.origem, origem),
        eq(webhookEventos.eventoId, eventoId),
        isNull(webhookEventos.processadoEm),
      ),
    );
}
