import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Esquema do banco (PostgreSQL). Fonte das migrações em drizzle/
 * (`npm run db:gerar`). Também é lido pelo migrador, que roda fora do Next:
 * por isso este arquivo não importa "server-only". O acesso do site passa
 * por src/lib/servidor/banco.ts.
 *
 * Travas que valem mesmo se o código do site errar: o papel do site só tem
 * as permissões de scripts/permissoes.ts (não cria administrador, não muda
 * valor de pedido) e pedido criado pelo site nasce "pendente" (gatilho da
 * migração 0001).
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const quando = (nome: string) => timestamp(nome, { withTimezone: true, mode: "date" });
const criadoEm = (nome = "criado_em") => quando(nome).notNull().defaultNow();
const atualizadoEm = () =>
  quando("atualizado_em")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const RESPOSTAS = ["sim", "nao"] as const;
export const MEIOS = ["cartao", "pix"] as const;
export const STATUS_PEDIDO = ["pendente", "aprovado", "recusado", "cancelado", "reembolsado"] as const;

/** "coluna IN ('a', 'b')" para os checks. */
function emLista(coluna: string, valores: readonly string[]) {
  return sql.raw(`${coluna} in (${valores.map((v) => `'${v}'`).join(", ")})`);
}

/** 55 + DDD + 8 ou 9 dígitos. */
const TELEFONE = "'^55[1-9]{2}[0-9]{8,9}$'";

// --- Convidados ----------------------------------------------------------

/** Confirmações de presença. Uma por convidado; o mesmo celular pode repetir. */
export const confirmacoes = pgTable(
  "confirmacoes",
  {
    id: id(),
    nomeCompleto: text("nome_completo").notNull(),
    telefone: text("telefone").notNull(),
    resposta: text("resposta", { enum: RESPOSTAS }).notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("confirmacoes_criado").on(t.criadoEm),
    index("confirmacoes_telefone").on(t.telefone),
    check("confirmacoes_nome_tamanho", sql`char_length(${t.nomeCompleto}) between 3 and 120`),
    check("confirmacoes_telefone_formato", sql`${t.telefone} ~ ${sql.raw(TELEFONE)}`),
    check("confirmacoes_resposta_valida", emLista("resposta", RESPOSTAS)),
  ],
);

// --- Administração -------------------------------------------------------

/**
 * Quem pode entrar no painel (futuro). Criado só pelo dono do banco (psql ou
 * painel do banco): o papel do site só lê esta tabela.
 */
export const administradores = pgTable(
  "administradores",
  {
    id: id(),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("administradores_telefone_unico").on(t.telefone),
    check("administradores_nome_tamanho", sql`char_length(${t.nome}) between 1 and 120`),
    check("administradores_telefone_formato", sql`${t.telefone} ~ ${sql.raw(TELEFONE)}`),
  ],
);

// --- Presentes -----------------------------------------------------------

/** Catálogo da lista de presentes. Preço em centavos. */
export const presentes = pgTable(
  "presentes",
  {
    id: id(),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull().default(""),
    precoCentavos: integer("preco_centavos").notNull(),
    imagemUrl: text("imagem_url").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(false),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("presentes_vitrine").on(t.ativo, t.ordem),
    check("presentes_nome_tamanho", sql`char_length(${t.nome}) between 1 and 160`),
    check("presentes_descricao_tamanho", sql`char_length(${t.descricao}) <= 2000`),
    check("presentes_preco", sql`${t.precoCentavos} >= 1`),
    check("presentes_ordem", sql`${t.ordem} >= 0`),
  ],
);

/**
 * Compra de um presente, sem login. O id (uuid) é o que o convidado usa para
 * acompanhar o pedido. CPF não fica no banco: vai só ao Mercado Pago.
 */
export const pedidos = pgTable(
  "pedidos",
  {
    id: id(),
    presenteId: uuid("presente_id")
      .notNull()
      .references(() => presentes.id, { onDelete: "restrict" }),
    /** Valor cobrado, copiado do presente na criação. Nunca muda depois. */
    valorCentavos: integer("valor_centavos").notNull(),
    meio: text("meio", { enum: MEIOS }).notNull(),
    status: text("status", { enum: STATUS_PEDIDO }).notNull().default("pendente"),
    compradorNome: text("comprador_nome").notNull(),
    compradorEmail: text("comprador_email").notNull(),
    /** 55 + DDD + número, ou vazio. */
    compradorTelefone: text("comprador_telefone").notNull().default(""),
    mpPaymentId: text("mp_payment_id"),
    externalReference: text("external_reference").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("pedidos_external_reference_unico").on(t.externalReference),
    uniqueIndex("pedidos_idempotency_key_unico").on(t.idempotencyKey),
    uniqueIndex("pedidos_mp_payment_id_unico").on(t.mpPaymentId),
    index("pedidos_presente").on(t.presenteId),
    check("pedidos_valor", sql`${t.valorCentavos} >= 1`),
    check("pedidos_meio_valido", emLista("meio", MEIOS)),
    check("pedidos_status_valido", emLista("status", STATUS_PEDIDO)),
    check("pedidos_comprador_nome_tamanho", sql`char_length(${t.compradorNome}) between 1 and 120`),
    check("pedidos_comprador_email_tamanho", sql`char_length(${t.compradorEmail}) between 3 and 254`),
    check(
      "pedidos_comprador_telefone_formato",
      sql`${t.compradorTelefone} = '' or ${t.compradorTelefone} ~ ${sql.raw(TELEFONE)}`,
    ),
  ],
);

/** Notificações do Mercado Pago já recebidas (idempotência do webhook). */
export const webhookEventos = pgTable(
  "webhook_eventos",
  {
    id: id(),
    origem: text("origem").notNull(),
    eventoId: text("evento_id").notNull(),
    tipo: text("tipo").notNull().default(""),
    recursoId: text("recurso_id").notNull().default(""),
    recebidoEm: criadoEm("recebido_em"),
    processadoEm: quando("processado_em"),
  },
  (t) => [uniqueIndex("webhook_eventos_unico").on(t.origem, t.eventoId)],
);
