import "server-only";
import { exigirEnv } from "./env";

/** URL base da Evolution API. Sem esquema, assume HTTPS. */
function urlBase() {
  const bruta = exigirEnv("EVOLUTION_API_URL").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(bruta) ? bruta : `https://${bruta}`;
}

export function evolutionConfigurada() {
  return Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);
}

/**
 * Envia uma mensagem de texto pelo WhatsApp. Lança erro se falhar.
 * POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
 */
export async function enviarTexto(numero: string, texto: string) {
  const instancia = encodeURIComponent(exigirEnv("EVOLUTION_INSTANCE"));
  const resposta = await fetch(`${urlBase()}/message/sendText/${instancia}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: exigirEnv("EVOLUTION_API_KEY"),
    },
    body: JSON.stringify({ number: numero, text: texto }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!resposta.ok) {
    // Só o status: o corpo pode repetir o número ou a mensagem.
    throw new Error(`Evolution API respondeu ${resposta.status}.`);
  }
}
