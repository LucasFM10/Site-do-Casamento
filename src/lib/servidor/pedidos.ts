import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { pedidos, presentes } from "@/db/esquema";
import type { DadosComprador } from "@/lib/presentes";
import { banco, idValido } from "./banco";
import { pagamentosMp, type PagamentoMp } from "./mercadopago";
import { estaEsgotado, reservadosSql } from "./presentes";
import { avisarPorWhatsapp } from "./whatsapp";

/**
 * Pedidos de presentes e pagamentos (checkout sem login).
 *
 * O preço vem sempre do presente, no servidor. O status só muda por
 * aplicarPagamento(), que recebe o pagamento lido do próprio Mercado Pago e
 * confere external_reference, id, valor e moeda, com o pedido travado.
 *
 * Quem chama (src/app/presentes/acoes.ts) valida o comprador antes, com
 * validarComprador (src/lib/presentes.ts).
 */

export type StatusPedido = "pendente" | "aprovado" | "recusado" | "cancelado" | "reembolsado";

export type Comprador = DadosComprador;

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

/** Sem o Access Token, o checkout avisa que o pagamento está indisponível. */
export function mercadoPagoConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/** Situação pública do pedido. O id (uuid) é o que o comprador recebe. */
export async function obterPedido(id: string) {
  if (!idValido(id)) return null;
  const db = await banco();
  const [r] = await db
    .select({ ...colunasPedido, presente: presentes.nome, criadoEm: pedidos.criadoEm })
    .from(pedidos)
    .innerJoin(presentes, eq(presentes.id, pedidos.presenteId))
    .where(eq(pedidos.id, id));
  return r ?? null;
}

export type FalhaPedido = "indisponivel" | "esgotado";

/**
 * Cria o pedido pendente com o preço do presente. O presente fica travado
 * durante a conta das unidades, para dois convidados não levarem a última.
 */
async function criarPedido(
  presenteId: string,
  meio: "cartao" | "pix",
  comprador: Comprador,
): Promise<{ pedido: Pedido; presente: Presente } | FalhaPedido> {
  if (!idValido(presenteId)) return "indisponivel";
  const db = await banco();
  return db.transaction(async (tx) => {
    const [presente] = await tx
      .select({
        id: presentes.id,
        nome: presentes.nome,
        precoCentavos: presentes.precoCentavos,
        quantidadeMaxima: presentes.quantidadeMaxima,
      })
      .from(presentes)
      .where(and(eq(presentes.id, presenteId), eq(presentes.ativo, true), isNull(presentes.removidoEm)))
      .for("update");
    if (!presente) return "indisponivel";

    if (presente.quantidadeMaxima !== null) {
      const [{ reservados }] = await tx
        .select({ reservados: reservadosSql })
        .from(presentes)
        .where(eq(presentes.id, presente.id));
      if (estaEsgotado(presente.quantidadeMaxima, reservados)) return "esgotado";
    }

    const [pedido] = await tx
      .insert(pedidos)
      .values({
        presenteId: presente.id,
        valorCentavos: presente.precoCentavos,
        meio,
        status: "pendente",
        compradorNome: comprador.nome,
        compradorEmail: comprador.email,
        compradorTelefone: comprador.telefone,
        mensagem: comprador.mensagem,
        externalReference: randomUUID(),
        idempotencyKey: randomUUID(),
      })
      .returning(colunasPedido);
    return { pedido, presente };
  });
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
// Pronto no servidor, mas sem página: o site hoje oferece só Pix.

export type DadosCartao = {
  token: string;
  paymentMethodId: string;
  installments: number;
  documentoTipo: string;
  documentoNumero: string;
};

export async function pagarComCartao(presenteId: string, comprador: Comprador, cartao: DadosCartao) {
  const criado = await criarPedido(presenteId, "cartao", comprador);
  if (typeof criado === "string") return criado;
  const { pedido, presente } = criado;

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
  return { pedidoId: pedido.id };
}

// --- Pix -----------------------------------------------------------------

/** Validade do QR: 30 minutos (o mínimo aceito pela API), com folga. */
export const VALIDADE_PIX_MINUTOS = 31;

export async function pagarComPix(presenteId: string, comprador: Comprador) {
  const criado = await criarPedido(presenteId, "pix", comprador);
  if (typeof criado === "string") return criado;
  const { pedido, presente } = criado;

  await criarPagamento(pedido, {
    transaction_amount: pedido.valorCentavos / 100,
    description: `Presente: ${presente.nome}`,
    payment_method_id: "pix",
    external_reference: pedido.externalReference,
    date_of_expiration: horarioBrasilia(Date.now() + VALIDADE_PIX_MINUTOS * 60_000),
    payer: { email: comprador.email, ...nomeESobrenome(comprador.nome) },
  });
  return { pedidoId: pedido.id };
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
 * Novo status do pedido a partir do pagamento lido do Mercado Pago, ou null
 * para não mudar nada. Recusa pagamento de outro pedido e aprovação com
 * valor ou moeda diferentes; um pedido aprovado não volta para pendente
 * por uma leitura atrasada.
 */
export function decidirStatus(
  pedido: Pick<Pedido, "id" | "status" | "valorCentavos" | "externalReference" | "mpPaymentId">,
  pagamento: Pick<PagamentoMp, "id" | "status" | "external_reference" | "transaction_amount" | "currency_id">,
): StatusPedido | null {
  if (pagamento.external_reference !== pedido.externalReference || String(pagamento.id) !== pedido.mpPaymentId) {
    console.error(`Pedido ${pedido.id}: pagamento ou external_reference não confere.`);
    return null;
  }

  let novo: StatusPedido = mapaStatus[pagamento.status ?? ""] ?? "pendente";

  if (novo === "aprovado") {
    const pagoCentavos = Math.round((pagamento.transaction_amount ?? 0) * 100);
    if (pagamento.currency_id !== "BRL" || pagoCentavos !== pedido.valorCentavos) {
      console.error(`Pedido ${pedido.id}: valor pago não confere com o pedido.`);
      return null;
    }
  }

  if (pedido.status === "aprovado" && novo === "pendente") novo = "aprovado";
  return novo === pedido.status ? null : novo;
}

/**
 * Consulta o pagamento do pedido no Mercado Pago e aplica o resultado.
 * Idempotente: pode ser chamada quantas vezes for preciso (resposta do
 * cartão, consulta de status do Pix, painel e webhook).
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

    const novo = decidirStatus(pedido, pagamento);
    if (!novo) return { status: pedido.status, agradecer: null };

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

// --- Acompanhamento pelo convidado ---------------------------------------

/** Última consulta ao Mercado Pago por pedido, para a página que acompanha o Pix. */
const ultimaConsulta = new Map<string, number>();
const INTERVALO_CONSULTA_MS = 10_000;

/**
 * Status atual para a página do pedido. Enquanto pendente, consulta o
 * Mercado Pago no máximo a cada 10 s (o webhook costuma chegar antes).
 */
export async function statusParaAcompanhar(id: string): Promise<StatusPedido | null> {
  const pedido = await obterPedido(id);
  if (!pedido) return null;
  if (pedido.status !== "pendente" || !pedido.mpPaymentId || !mercadoPagoConfigurado()) return pedido.status;

  const agora = Date.now();
  if (agora - (ultimaConsulta.get(id) ?? 0) < INTERVALO_CONSULTA_MS) return pedido.status;
  ultimaConsulta.set(id, agora);
  if (ultimaConsulta.size > 5000) ultimaConsulta.clear();

  try {
    return await confirmarPagamento(id);
  } catch (erro) {
    console.error(`Pedido ${id}: falha ao consultar o Mercado Pago.`, erro instanceof Error ? erro.message : "");
    return pedido.status;
  }
}

// --- Painel --------------------------------------------------------------

export async function listarPedidosAdmin(filtro: { status?: StatusPedido; comMensagem?: boolean } = {}) {
  const db = await banco();
  const condicoes = [
    filtro.status ? eq(pedidos.status, filtro.status) : undefined,
    filtro.comMensagem ? sql`${pedidos.mensagem} <> ''` : undefined,
  ].filter(Boolean);
  return db
    .select({
      id: pedidos.id,
      presente: presentes.nome,
      valorCentavos: pedidos.valorCentavos,
      meio: pedidos.meio,
      status: pedidos.status,
      compradorNome: pedidos.compradorNome,
      compradorEmail: pedidos.compradorEmail,
      compradorTelefone: pedidos.compradorTelefone,
      mensagem: pedidos.mensagem,
      mpPaymentId: pedidos.mpPaymentId,
      criadoEm: pedidos.criadoEm,
      atualizadoEm: pedidos.atualizadoEm,
    })
    .from(pedidos)
    .innerJoin(presentes, eq(presentes.id, pedidos.presenteId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(pedidos.criadoEm));
}

export async function resumoPedidos() {
  const db = await banco();
  const linhas = await db
    .select({
      status: pedidos.status,
      total: sql<number>`count(*)::int`,
      valor: sql<number>`coalesce(sum(${pedidos.valorCentavos}), 0)::int`,
    })
    .from(pedidos)
    .groupBy(pedidos.status);
  const de = (status: StatusPedido) => linhas.find((l) => l.status === status) ?? { total: 0, valor: 0 };
  return { aprovados: de("aprovado"), pendentes: de("pendente"), total: linhas.reduce((s, l) => s + l.total, 0) };
}
