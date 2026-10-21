import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Esquema do banco (PostgreSQL). Fonte das migrações em drizzle/
 * (`npm run db:gerar`). Também é lido pelo migrador, que roda fora do Next:
 * por isso este arquivo não importa "server-only". O acesso do site passa
 * por src/lib/servidor/banco.ts.
 *
 * Travas que valem mesmo se o código do site errar: o papel do site só tem
 * as permissões de scripts/permissoes.ts (não cria administrador, não muda
 * valor de pedido, não apaga confirmação nem pedido) e pedido criado pelo
 * site nasce "pendente" (gatilho da migração 0001).
 */

const id = () => uuid("id").primaryKey().defaultRandom();
const quando = (nome: string) => timestamp(nome, { withTimezone: true, mode: "date" });
const criadoEm = (nome = "criado_em") => quando(nome).notNull().defaultNow();
const atualizadoEm = () =>
  quando("atualizado_em")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const RESPOSTAS = ["sim", "nao"] as const;
export const MEIOS = ["cartao", "pix"] as const;
export const STATUS_PEDIDO = ["pendente", "aprovado", "recusado", "cancelado", "reembolsado"] as const;
export const GRUPOS_IMAGEM = ["presente", "carrossel"] as const;
export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"] as const;
/** Tamanho máximo de uma imagem guardada (o navegador já envia reduzida). */
export const MAX_BYTES_IMAGEM = 1_500_000;

/** "coluna IN ('a', 'b')" para os checks. */
function emLista(coluna: string, valores: readonly string[]) {
  return sql.raw(`${coluna} in (${valores.map((v) => `'${v}'`).join(", ")})`);
}

/** 55 + DDD + 8 ou 9 dígitos. */
const TELEFONE = "'^55[1-9]{2}[0-9]{8,9}$'";

// --- Convidados ----------------------------------------------------------

/**
 * Confirmações de presença. Uma por convidado; o mesmo celular pode repetir.
 * Nada é sobrescrito: uma resposta nova do mesmo convidado entra como linha
 * nova, e o painel considera a mais recente (src/lib/confirmacoes.ts).
 */
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
 * Quem pode entrar no painel (/admin). Criado só pelo dono do banco (psql ou
 * painel do banco): o papel do site só lê esta tabela.
 *
 * A senha fica como hash bcrypt gerado no próprio PostgreSQL:
 * crypt('senha', gen_salt('bf', 12)), do pgcrypto (migração 0002). Sem
 * senha, o administrador não entra.
 */
export const administradores = pgTable(
  "administradores",
  {
    id: id(),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    senhaHash: text("senha_hash"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("administradores_telefone_unico").on(t.telefone),
    check("administradores_nome_tamanho", sql`char_length(${t.nome}) between 1 and 120`),
    check("administradores_telefone_formato", sql`${t.telefone} ~ ${sql.raw(TELEFONE)}`),
    check("administradores_senha_bcrypt", sql`${t.senhaHash} is null or ${t.senhaHash} ~ '^[$]2[abxy][$][0-9]{2}[$]'`),
  ],
);

/** Sessões do painel. O cookie leva o token; aqui fica só o SHA-256 dele. */
export const sessoesAdmin = pgTable(
  "sessoes_admin",
  {
    id: id(),
    administradorId: uuid("administrador_id")
      .notNull()
      .references(() => administradores.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    criadoEm: criadoEm(),
    expiraEm: quando("expira_em").notNull(),
  },
  (t) => [
    uniqueIndex("sessoes_admin_token_unico").on(t.tokenHash),
    index("sessoes_admin_expira").on(t.expiraEm),
  ],
);

/**
 * Tentativas contadas para limitar abuso (login errado, Pix gerado,
 * confirmação enviada), por chave ("login:tel:5583...", "pix:ip:1.2.3.4").
 */
export const limiteTentativas = pgTable(
  "limite_tentativas",
  {
    id: id(),
    chave: text("chave").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("limite_tentativas_chave").on(t.chave, t.criadoEm),
    check("limite_tentativas_chave_tamanho", sql`char_length(${t.chave}) between 1 and 200`),
  ],
);

// --- Conteúdo do site ----------------------------------------------------

/**
 * Informações editáveis da página inicial (data, locais, textos), em chave
 * e valor. As chaves válidas e os valores padrão ficam em
 * src/lib/configuracoes.ts; chave sem linha aqui usa o padrão.
 */
export const configuracoes = pgTable(
  "configuracoes",
  {
    chave: text("chave").primaryKey(),
    valor: text("valor").notNull(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    check("configuracoes_chave_formato", sql`${t.chave} ~ '^[a-z][a-z0-9_]{0,59}$'`),
    check("configuracoes_valor_tamanho", sql`char_length(${t.valor}) <= 4000`),
  ],
);

// --- Presentes -----------------------------------------------------------

/**
 * Catálogo da lista de presentes. Preço em centavos. Sem quantidade máxima,
 * o presente pode ser dado quantas vezes quiserem. Presente que já teve
 * pedido não é apagado: recebe removido_em e some do site e do painel.
 */
export const presentes = pgTable(
  "presentes",
  {
    id: id(),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull().default(""),
    precoCentavos: integer("preco_centavos").notNull(),
    /** Legado (antes das imagens enviadas pelo painel). Não é mais usado. */
    imagemUrl: text("imagem_url").notNull().default(""),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(false),
    quantidadeMaxima: integer("quantidade_maxima"),
    removidoEm: quando("removido_em"),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("presentes_vitrine").on(t.ativo, t.ordem),
    check("presentes_nome_tamanho", sql`char_length(${t.nome}) between 1 and 160`),
    check("presentes_descricao_tamanho", sql`char_length(${t.descricao}) <= 2000`),
    check("presentes_preco", sql`${t.precoCentavos} >= 1`),
    check("presentes_ordem", sql`${t.ordem} >= 0`),
    check("presentes_quantidade_maxima", sql`${t.quantidadeMaxima} is null or ${t.quantidadeMaxima} >= 1`),
  ],
);

/**
 * Imagens enviadas pelo painel: fotos dos presentes e do carrossel da página
 * inicial. Ficam no banco (entram no backup) e são servidas por
 * /api/imagens/[id], com cache longo: o conteúdo de um id nunca muda.
 */
export const imagens = pgTable(
  "imagens",
  {
    id: id(),
    grupo: text("grupo", { enum: GRUPOS_IMAGEM }).notNull(),
    presenteId: uuid("presente_id").references(() => presentes.id, { onDelete: "cascade" }),
    ordem: integer("ordem").notNull().default(0),
    tipo: text("tipo", { enum: TIPOS_IMAGEM }).notNull(),
    largura: integer("largura").notNull(),
    altura: integer("altura").notNull(),
    dados: bytea("dados").notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("imagens_presente").on(t.presenteId, t.ordem),
    index("imagens_grupo").on(t.grupo, t.ordem),
    check("imagens_grupo_valido", emLista("grupo", GRUPOS_IMAGEM)),
    check("imagens_tipo_valido", emLista("tipo", TIPOS_IMAGEM)),
    check("imagens_presente_do_grupo", sql`(${t.grupo} = 'presente') = (${t.presenteId} is not null)`),
    check("imagens_tamanho", sql`octet_length(${t.dados}) between 1 and ${sql.raw(String(MAX_BYTES_IMAGEM))}`),
    check("imagens_dimensoes", sql`${t.largura} between 1 and 10000 and ${t.altura} between 1 and 10000`),
    check("imagens_ordem", sql`${t.ordem} >= 0`),
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
    /** Recado do convidado aos noivos, opcional. */
    mensagem: text("mensagem").notNull().default(""),
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
    index("pedidos_criado").on(t.criadoEm),
    check("pedidos_valor", sql`${t.valorCentavos} >= 1`),
    check("pedidos_meio_valido", emLista("meio", MEIOS)),
    check("pedidos_status_valido", emLista("status", STATUS_PEDIDO)),
    check("pedidos_comprador_nome_tamanho", sql`char_length(${t.compradorNome}) between 1 and 120`),
    check("pedidos_comprador_email_tamanho", sql`char_length(${t.compradorEmail}) between 3 and 254`),
    check(
      "pedidos_comprador_telefone_formato",
      sql`${t.compradorTelefone} = '' or ${t.compradorTelefone} ~ ${sql.raw(TELEFONE)}`,
    ),
    check("pedidos_mensagem_tamanho", sql`char_length(${t.mensagem}) <= 1000`),
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
