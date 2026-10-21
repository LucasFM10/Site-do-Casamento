import "server-only";
import { enviarTexto, evolutionConfigurada } from "./evolution";

/**
 * Mensagens automáticas pelo WhatsApp. O texto de cada uma vem de uma
 * variável de ambiente; vazia, a mensagem não é enviada. Sem a Evolution API
 * configurada, nada é enviado.
 *
 * No texto, {chave} é trocado pelo valor correspondente e "\n" vira quebra
 * de linha (o painel do Coolify guarda a variável numa linha só).
 */
export type ModeloMensagem =
  | "WHATSAPP_MSG_CONFIRMACAO_SIM"
  | "WHATSAPP_MSG_CONFIRMACAO_NAO"
  | "WHATSAPP_MSG_PRESENTE_APROVADO";

export function preencherModelo(modelo: string, valores: Record<string, string>) {
  return modelo
    .replace(/\\n/g, "\n")
    .replace(/\{(\w+)\}/g, (original, chave: string) => (chave in valores ? valores[chave] : original));
}

/** Envia, se configurado. Nunca lança: falha de WhatsApp não desfaz nada no site. */
export async function avisarPorWhatsapp(modelo: ModeloMensagem, telefone: string, valores: Record<string, string>) {
  const texto = process.env[modelo]?.trim();
  if (!texto || !telefone || !evolutionConfigurada()) return false;
  try {
    await enviarTexto(telefone, preencherModelo(texto, valores));
    return true;
  } catch (erro) {
    console.error(`WhatsApp: falha ao enviar ${modelo}.`, erro instanceof Error ? erro.message : "");
    return false;
  }
}
