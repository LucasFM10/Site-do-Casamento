import { mensagemDoErro } from "@/lib/servidor/banco";
import { assinaturaWebhookValida } from "@/lib/servidor/mercadopago";
import { confirmarPagamentoMp } from "@/lib/servidor/pedidos";
import { concluirEvento, registrarEvento } from "@/lib/servidor/webhooks";

/**
 * Webhook do Mercado Pago (cadastrado na aplicação, evento "Pagamentos").
 *
 * 1. Confere a assinatura antes de usar qualquer dado.
 * 2. Do corpo, usa só o id do pagamento. Status, valor e pedido são lidos
 *    do próprio Mercado Pago (confirmarPagamentoMp).
 * 3. Idempotente: a mesma notificação processada não se repete, e a
 *    confirmação do pedido também é idempotente.
 *
 * Responde 200 depois de processar. Erro no processamento responde 500,
 * para o Mercado Pago tentar de novo.
 */

const MAX_CORPO = 64 * 1024;

export async function POST(request: Request) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("Webhook do Mercado Pago recebido sem MP_WEBHOOK_SECRET configurada.");
    return new Response("Indisponível", { status: 503 });
  }

  const texto = await request.text();
  if (texto.length > MAX_CORPO) return new Response("Corpo grande demais", { status: 413 });
  let corpo: { id?: unknown; type?: unknown; action?: unknown; data?: { id?: unknown } } = {};
  try {
    corpo = texto ? JSON.parse(texto) : {};
  } catch {
    // Sem JSON válido, vale o que vier na URL.
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? (corpo.data?.id != null ? String(corpo.data.id) : null);
  const xRequestId = request.headers.get("x-request-id");
  const valida = assinaturaWebhookValida({
    segredo,
    xSignature: request.headers.get("x-signature"),
    xRequestId,
    dataId,
  });
  if (!valida) return new Response("Assinatura inválida", { status: 401 });

  const tipo = String(url.searchParams.get("type") ?? corpo.type ?? "");
  if (tipo !== "payment" || !dataId || !/^\d{1,30}$/.test(dataId)) {
    return new Response("Ignorado", { status: 200 });
  }

  const eventoId = String(corpo.id ?? xRequestId ?? `${dataId}:${corpo.action ?? ""}`).slice(0, 100);
  try {
    if ((await registrarEvento({ origem: "mercadopago", eventoId, tipo, recursoId: dataId })) === "repetido") {
      return new Response("Já processado", { status: 200 });
    }
    await confirmarPagamentoMp(dataId);
    await concluirEvento("mercadopago", eventoId);
  } catch (erro) {
    console.error(`Webhook do Mercado Pago: falha ao processar o pagamento ${dataId}.`, mensagemDoErro(erro));
    return new Response("Erro", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}
