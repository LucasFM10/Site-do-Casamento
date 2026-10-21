import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { exigirEnv } from "./env";

/** Cliente da Payments API. O Access Token nunca sai do servidor. */
export function pagamentosMp() {
  const config = new MercadoPagoConfig({
    accessToken: exigirEnv("MP_ACCESS_TOKEN"),
    options: { timeout: 15_000 },
  });
  return new Payment(config);
}

export type PagamentoMp = Awaited<ReturnType<Payment["get"]>>;

/** Chave pública, entregue à página em tempo de execução. */
export function chavePublicaMp() {
  return exigirEnv("MP_PUBLIC_KEY");
}

function iguais(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Confere a assinatura de uma notificação do webhook (cabeçalho
 * x-signature: "ts=...,v1=..."). O v1 é o HMAC-SHA256, com a chave secreta
 * da aplicação (MP_WEBHOOK_SECRET), do texto
 * "id:{data.id};request-id:{x-request-id};ts:{ts};", sem as partes que não
 * vierem na notificação. data.id alfanumérico vai em minúsculas.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function assinaturaWebhookValida(dados: {
  segredo: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const partes = Object.fromEntries(
    (dados.xSignature ?? "").split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  const id = dados.dataId && /^[a-z0-9]+$/i.test(dados.dataId) ? dados.dataId.toLowerCase() : dados.dataId;
  const manifesto =
    (id ? `id:${id};` : "") + (dados.xRequestId ? `request-id:${dados.xRequestId};` : "") + `ts:${ts};`;
  const esperado = createHmac("sha256", dados.segredo).update(manifesto).digest("hex");
  return iguais(esperado, v1.toLowerCase());
}
