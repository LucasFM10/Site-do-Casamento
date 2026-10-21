-- pgcrypto: crypt() e gen_salt() para a senha dos administradores. O dono do
-- banco gera o hash no psql; o site só confere (src/lib/servidor/admin.ts).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracoes_chave_formato" CHECK ("configuracoes"."chave" ~ '^[a-z][a-z0-9_]{0,59}$'),
	CONSTRAINT "configuracoes_valor_tamanho" CHECK (char_length("configuracoes"."valor") <= 4000)
);
--> statement-breakpoint
CREATE TABLE "imagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grupo" text NOT NULL,
	"presente_id" uuid,
	"ordem" integer DEFAULT 0 NOT NULL,
	"tipo" text NOT NULL,
	"largura" integer NOT NULL,
	"altura" integer NOT NULL,
	"dados" "bytea" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imagens_grupo_valido" CHECK (grupo in ('presente', 'carrossel')),
	CONSTRAINT "imagens_tipo_valido" CHECK (tipo in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "imagens_presente_do_grupo" CHECK (("imagens"."grupo" = 'presente') = ("imagens"."presente_id" is not null)),
	CONSTRAINT "imagens_tamanho" CHECK (octet_length("imagens"."dados") between 1 and 1500000),
	CONSTRAINT "imagens_dimensoes" CHECK ("imagens"."largura" between 1 and 10000 and "imagens"."altura" between 1 and 10000),
	CONSTRAINT "imagens_ordem" CHECK ("imagens"."ordem" >= 0)
);
--> statement-breakpoint
CREATE TABLE "limite_tentativas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "limite_tentativas_chave_tamanho" CHECK (char_length("limite_tentativas"."chave") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "sessoes_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"administrador_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "administradores" ADD COLUMN "senha_hash" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "mensagem" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "presentes" ADD COLUMN "quantidade_maxima" integer;--> statement-breakpoint
ALTER TABLE "presentes" ADD COLUMN "removido_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "imagens" ADD CONSTRAINT "imagens_presente_id_presentes_id_fk" FOREIGN KEY ("presente_id") REFERENCES "public"."presentes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes_admin" ADD CONSTRAINT "sessoes_admin_administrador_id_administradores_id_fk" FOREIGN KEY ("administrador_id") REFERENCES "public"."administradores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "imagens_presente" ON "imagens" USING btree ("presente_id","ordem");--> statement-breakpoint
CREATE INDEX "imagens_grupo" ON "imagens" USING btree ("grupo","ordem");--> statement-breakpoint
CREATE INDEX "limite_tentativas_chave" ON "limite_tentativas" USING btree ("chave","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "sessoes_admin_token_unico" ON "sessoes_admin" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessoes_admin_expira" ON "sessoes_admin" USING btree ("expira_em");--> statement-breakpoint
CREATE INDEX "pedidos_criado" ON "pedidos" USING btree ("criado_em");--> statement-breakpoint
ALTER TABLE "administradores" ADD CONSTRAINT "administradores_senha_bcrypt" CHECK ("administradores"."senha_hash" is null or "administradores"."senha_hash" ~ '^[$]2[abxy][$][0-9]{2}[$]');--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_mensagem_tamanho" CHECK (char_length("pedidos"."mensagem") <= 1000);--> statement-breakpoint
ALTER TABLE "presentes" ADD CONSTRAINT "presentes_quantidade_maxima" CHECK ("presentes"."quantidade_maxima" is null or "presentes"."quantidade_maxima" >= 1);