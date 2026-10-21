-- Trava de inserção que o papel do site não consegue contornar.
--
-- O site entra no banco com um papel de permissões limitadas
-- (scripts/permissoes.ts). As permissões por coluna já impedem o site de
-- mudar valor, presente ou comprador de um pedido gravado. Este gatilho
-- cobre o momento da criação: pedido criado pelo site nasce "pendente" (só o
-- pagamento conferido no Mercado Pago muda o status).
--
-- O dono do banco (pessoas, pelo psql ou painel do banco) passa pela trava.

CREATE FUNCTION "pode_ignorar_travas"(tabela regclass) RETURNS boolean
LANGUAGE sql STABLE
SET search_path = pg_catalog
AS $$
  SELECT r.rolsuper OR pg_has_role(current_user, c.relowner, 'USAGE')
  FROM pg_roles r, pg_class c
  WHERE r.rolname = current_user AND c.oid = tabela
$$;
--> statement-breakpoint
CREATE FUNCTION "pedidos_nasce_pendente"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status <> 'pendente' AND NOT pode_ignorar_travas(TG_RELID) THEN
    RAISE EXCEPTION 'Pedido novo precisa nascer pendente.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "pedidos_nasce_pendente" BEFORE INSERT ON "pedidos"
FOR EACH ROW EXECUTE FUNCTION "pedidos_nasce_pendente"();
