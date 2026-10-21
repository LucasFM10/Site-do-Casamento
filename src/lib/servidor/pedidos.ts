import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { pedidos, presentes } from "@/db/esquema";
import { banco, idValido } from "./banco";
import { pagamentosMp, type PagamentoMp } from "./mercadopago";
import { avisarPorWhatsapp } from "./whatsapp";

/**
 * Pedidos de presentes e pagamentos (checkout sem login).
 *
 * O preço vem sempre do presente, no servidor. O status só muda por
 * aplicarPagamento(), que recebe o pagamento lido do próprio Mercado Pago e
 * confere external_reference, id, valor e moeda, com o pedido travado.
 *
 * Quem chama (a futura página de checkout) valida nome, e-mail, telefone e
 * CPF do comprador antes; o CPF vai só ao Mercado Pago, não ao banco.
 */

export type StatusPedido = "pendente" | "aprovado" | "recusado" | "cancelado" | "reembolsado";

export type Comprador = {
  nome: string;
  email: string;
  /** 55 + DDD + número, ou vazio. */
  telefone: string;
};

const colunasPedido = {
  id: pedidos.id,
  presenteId: pedidos.presenteId,
  valorCentavos: pedidos.valorCentavos,
  meio: pedidos.meio,
  status: pedidos.status,
  compradorNome: pedidos.compradorNome,
  compradorTelefone: pedidos.compradorTelefone,
  mpPaymentId: pedidos.mpPaymentId,
  externalReference: pedidos.externalReference,
  idempotencyKey: pedidos.idempotencyKey,
};

type Pedido = {
  id: string;
  presenteId: string;
  valorCentavos: number;
  meio: "cartao" | "pix";
  status: StatusPedido;
  compradorNome: string;
  compradorTelefone: string;
  mpPaymentId: string | null;
  externalReference: string;
  idempotencyKey: string;
};

type Presente = { id: string; nome: string; precoCentavos: number };

async function obterPresenteAtivo(id: string): Promise<Presente | null> {
  if (!idValido(id)) return null;
  const db = await banco();
  const [p] = await db
    .select({ id: presentes.id, nome: presentes.nome, precoCentavos: presentes.precoCentavos })
    .from(presentes)
    .where(and(eq(presentes.id, id), eq(presentes.ativo, true)));
  return p ?? null;
}

/** Situação pública do pedido. O id (uuid) é o que o comprador recebe. */
export async function obterPedido(id: string) {
  if (!idValido(id)) return null;
  const db = await banco();
  const [r] = await db
    .select({ ...colunasPedido, presente: presentes.nome })
    .from(pedidos)
    .innerJoin(presentes, eq(presentes.id, pedidos.presenteId))
    .where(eq(pedidos.id, id));
  return r ?? null;
}

async function criarPedido(presente: Presente, meio: "cartao" | "pix", comprador: Comprador): Promise<Pedido> {
  const db = await banco();
  const [r] = await db
    .insert(pedidos)
    .values({
      presenteId: presente.id,
      valorCentavos: presente.precoCentavos,
      meio,
      status: "pendente",
      compradorNome: comprador.nome,
      compradorEmail: comprador.email,
      compradorTelefone: comprador.telefone,
      externalReference: randomUUID(),
      idempotencyKey: randomUUID(),
    })
    .returning(colunasPedido);
  return r;
}

/** Liga o pagamento ao pedido. Só grava se ainda não houver um. */
async function gravarPagamento(pedidoId: string, mpPaymentId: string) {
  const db = await banco();
  await db
    .update(pedidos)
    .set({ mpPaymentId })
    .where(and(eq(pedidos.id, pedidoId), isNull(pedidos.mpPaymentId)));
}

/**
 * Cria o pagamento no Mercado Pago. Se a API recusar a criação, o pedido é
 * cancelado e o erro sobe. No log vai só a mensagem e a causa da API,
 * nunca o corpo enviado (que tem o token do cartão).
 */
async function criarPagamento(
  pedido: Pedido,
  body: Parameters<ReturnType<typeof pagamentosMp>["create"]>[0]["body"],
) {
  let pagamento: PagamentoMp;
  try {
    pagamento = await pagamentosMp().create({
      body,
      requestOptions: { idempotencyKey: pedido.idempotencyKey },
    });
  } catch (erro) {
    const e = erro as { message?: string; cause?: unknown; status?: number };
    console.error(
      `Pedido ${pedido.id}: Mercado Pago recusou a criação do pagamento.`,
      e.status ?? "",
      e.message ?? "",
      JSON.stringify(e.cause ?? ""),
    );
    const db = await banco();
    await db
      .update(pedidos)
      .set({ status: "cancelado" })
      .where(and(eq(pedidos.id, pedido.id), eq(pedidos.status, "pendente")));
    throw new Error("Falha ao criar pagamento.");
  }
  if (pagamento.id) await gravarPagamento(pedido.id, String(pagamento.id));
  return pagamento;
}

function nomeESobrenome(nome: string) {
  const [primeiro, ...resto] = nome.trim().split(/\s+/);
  return { first_name: primeiro, last_name: resto.join(" ") || undefined };
}

// --- Cartão (token gerado no navegador pelo Card Payment Brick) ----------

export type DadosCartao = {
  token: string;
  paymentMethodId: string;
  installments: number;
  documentoTipo: string;
  documentoNumero: string;
};

export async function pagarComCartao(presenteId: string, comprador: Comprador, cartao: DadosCartao) {
  const presente = await obterPresenteAtivo(presenteId);
  if (!presente) return null;

  const pedido = await criarPedido(presente, "cartao", comprador);
  await criarPagamento(pedido, {
    transaction_amount: pedido.valorCentavos / 100,
    token: cartao.token,
    description: `Presente: ${presente.nome}`,
    installments: cartao.installments,
    payment_method_id: cartao.paymentMethodId,
    external_reference: pedido.externalReference,
    payer: {
      email: comprador.email,
      ...nomeESobrenome(comprador.nome),
      identification: { type: cartao.documentoTipo, number: cartao.documentoNumero },
    },
    // As notificações chegam pelo webhook cadastrado na aplicação do
    // Mercado Pago (/api/mercadopago/webhook), não por notification_url.
  });
  await confirmarPagamento(pedido.id);
  return pedido.id;
}

// --- Pix -----------------------------------------------------------------

export async function pagarComPix(presenteId: string, comprador: Comprador, cpf: string) {
  const presente = await obterPresenteAtivo(presenteId);
  if (!presente) return null;

  const pedido = await criarPedido(presente, "pix", comprador);
  await criarPagamento(pedido, {
    transaction_amount: pedido.valorCentavos / 100,
    description: `Presente: ${presente.nome}`,
    payment_method_id: "pix",
    external_reference: pedido.externalReference,
    // Validade do QR: 30 minutos (o mínimo aceito pela API), com folga.
    date_of_expiration: horarioBrasilia(Date.now() + 31 * 60_000),
    payer: {
      email: comprador.email,
      ...nomeESobrenome(comprador.nome),
      identification: { type: "CPF", number: cpf },
    },
  });
  return pedido.id;
}

/** "2026-10-17T12:00:00.000-03:00", formato dos exemplos da API. */
function horarioBrasilia(ms: number) {
  return new Date(ms - 3 * 3_600_000).toISOString().replace("Z", "-03:00");
}

/** Dados do QR do Pix, lidos do Mercado Pago na hora (não ficam no banco). */
export async function dadosPix(pedido: { meio: string; mpPaymentId: string | null }) {
  if (pedido.meio !== "pix" || !pedido.mpPaymentId) return null;
  const p = await pagamentosMp().get({ id: pedido.mpPaymentId });
  const t = p.point_of_interaction?.transaction_data;
  if (!t?.qr_code) return null;
  return {
    qrCode: t.qr_code,
    qrCodeBase64: t.qr_code_base64 ?? "",
    expiraEm: p.date_of_expiration ?? "",
  };
}

// --- Confirmação ---------------------------------------------------------

const mapaStatus: Record<string, StatusPedido> = {
  approved: "aprovado",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "reembolsado",
  charged_back: "reembolsado",
};

/**
 * Consulta o pagamento do pedido no Mercado Pago e aplica o resultado.
 * Idempotente: pode ser chamada quantas vezes for preciso (resposta do
 * cartão, consulta de status do Pix e webhook).
 */
export async function confirmarPagamento(pedidoId: string): Promise<StatusPedido> {
  const db = await banco();
  const [pedido] = await db.select(colunasPedido).from(pedidos).where(eq(pedidos.id, pedidoId));
  if (!pedido) throw new Error(`Pedido ${pedidoId} não existe.`);
  if (!pedido.mpPaymentId) return pedido.status;
  const pagamento = await pagamentosMp().get({ id: pedido.mpPaymentId });
  return aplicarPagamento(pedido.id, pagamento);
}

/**
 * Webhook: confirma pelo id do pagamento. O pedido é achado pelo
 * external_reference lido do próprio Mercado Pago (nunca do corpo da
 * notificação). Se a notificação chegar antes de o pedido guardar o id do
 * pagamento, o id é gravado aqui. Devolve null se o pagamento não é de um
 * pedido deste site.
 */
export async function confirmarPagamentoMp(paymentId: string): Promise<StatusPedido | null> {
  const pagamento = await pagamentosMp().get({ id: paymentId });
  if (!pagamento.external_reference) return null;

  const db = await banco();
  const [pedido] = await db
    .select(colunasPedido)
    .from(pedidos)
    .where(eq(pedidos.externalReference, pagamento.external_reference));
  if (!pedido) return null;

  if (!pedido.mpPaymentId) await gravarPagamento(pedido.id, String(pagamento.id));
  return aplicarPagamento(pedido.id, pagamento);
}

/** Aplica o pagamento lido do Mercado Pago ao pedido, com o pedido travado. */
async function aplicarPagamento(pedidoId: string, pagamento: PagamentoMp): Promise<StatusPedido> {
  const db = await banco();
  const { status, agradecer } = await db.transaction(async (tx) => {
    const [pedido] = await tx
      .select({ ...colunasPedido, presente: presentes.nome })
      .from(pedidos)
      .innerJoin(presentes, eq(presentes.id, pedidos.presenteId))
      .where(eq(pedidos.id, pedidoId))
      .for("update", { of: pedidos });

    const semMudanca = { status: pedido.status, agradecer: null };
    if (
      pagamento.external_reference !== pedido.externalReference ||
      String(pagamento.id) !== pedido.mpPaymentId
    ) {
      console.error(`Pedido ${pedido.id}: pagamento ou external_reference não confere.`);
      return semMudanca;
    }

    let novo: StatusPedido = mapaStatus[pagamento.status ?? ""] ?? "pendente";

    if (novo === "aprovado") {
      const pagoCentavos = Math.round((pagamento.transaction_amount ?? 0) * 100);
      if (pagamento.currency_id !== "BRL" || pagoCentavos !== pedido.valorCentavos) {
        console.error(`Pedido ${pedido.id}: valor pago não confere com o pedido.`);
        return semMudanca;
      }
    }

    // Um pedido aprovado não volta para pendente por uma leitura atrasada.
    if (pedido.status === "aprovado" && novo === "pendente") novo = "aprovado";
    if (novo === pedido.status) return semMudanca;

    await tx.update(pedidos).set({ status: novo }).where(eq(pedidos.id, pedido.id));
    return { status: novo, agradecer: novo === "aprovado" ? pedido : null };
  });

  if (agradecer?.compradorTelefone) {
    const { compradorTelefone, compradorNome, presente } = agradecer;
    after(() =>
      avisarPorWhatsapp("WHATSAPP_MSG_PRESENTE_APROVADO", compradorTelefone, {
        nome: compradorNome.split(" ")[0],
        presente,
      }),
    );
  }
  return status;
}
