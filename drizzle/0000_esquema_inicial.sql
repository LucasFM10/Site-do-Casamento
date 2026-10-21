CREATE TABLE "administradores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "administradores_nome_tamanho" CHECK (char_length("administradores"."nome") between 1 and 120),
	CONSTRAINT "administradores_telefone_formato" CHECK ("administradores"."telefone" ~ '^55[1-9]{2}[0-9]{8,9}$')
);
--> statement-breakpoint
CREATE TABLE "confirmacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_completo" text NOT NULL,
	"telefone" text NOT NULL,
	"resposta" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirmacoes_nome_tamanho" CHECK (char_length("confirmacoes"."nome_completo") between 3 and 120),
	CONSTRAINT "confirmacoes_telefone_formato" CHECK ("confirmacoes"."telefone" ~ '^55[1-9]{2}[0-9]{8,9}$'),
	CONSTRAINT "confirmacoes_resposta_valida" CHECK (resposta in ('sim', 'nao'))
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"presente_id" uuid NOT NULL,
	"valor_centavos" integer NOT NULL,
	"meio" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"comprador_nome" text NOT NULL,
	"comprador_email" text NOT NULL,
	"comprador_telefone" text DEFAULT '' NOT NULL,
	"mp_payment_id" text,
	"external_reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_valor" CHECK ("pedidos"."valor_centavos" >= 1),
	CONSTRAINT "pedidos_meio_valido" CHECK (meio in ('cartao', 'pix')),
	CONSTRAINT "pedidos_status_valido" CHECK (status in ('pendente', 'aprovado', 'recusado', 'cancelado', 'reembolsado')),
	CONSTRAINT "pedidos_comprador_nome_tamanho" CHECK (char_length("pedidos"."comprador_nome") between 1 and 120),
	CONSTRAINT "pedidos_comprador_email_tamanho" CHECK (char_length("pedidos"."comprador_email") between 3 and 254),
	CONSTRAINT "pedidos_comprador_telefone_formato" CHECK ("pedidos"."comprador_telefone" = '' or "pedidos"."comprador_telefone" ~ '^55[1-9]{2}[0-9]{8,9}$')
);
--> statement-breakpoint
CREATE TABLE "presentes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"preco_centavos" integer NOT NULL,
	"imagem_url" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presentes_nome_tamanho" CHECK (char_length("presentes"."nome") between 1 and 160),
	CONSTRAINT "presentes_descricao_tamanho" CHECK (char_length("presentes"."descricao") <= 2000),
	CONSTRAINT "presentes_preco" CHECK ("presentes"."preco_centavos" >= 1),
	CONSTRAINT "presentes_ordem" CHECK ("presentes"."ordem" >= 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origem" text NOT NULL,
	"evento_id" text NOT NULL,
	"tipo" text DEFAULT '' NOT NULL,
	"recurso_id" text DEFAULT '' NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_presente_id_presentes_id_fk" FOREIGN KEY ("presente_id") REFERENCES "public"."presentes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "administradores_telefone_unico" ON "administradores" USING btree ("telefone");--> statement-breakpoint
CREATE INDEX "confirmacoes_criado" ON "confirmacoes" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "confirmacoes_telefone" ON "confirmacoes" USING btree ("telefone");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_external_reference_unico" ON "pedidos" USING btree ("external_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_idempotency_key_unico" ON "pedidos" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_mp_payment_id_unico" ON "pedidos" USING btree ("mp_payment_id");--> statement-breakpoint
CREATE INDEX "pedidos_presente" ON "pedidos" USING btree ("presente_id");--> statement-breakpoint
CREATE INDEX "presentes_vitrine" ON "presentes" USING btree ("ativo","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_eventos_unico" ON "webhook_eventos" USING btree ("origem","evento_id");