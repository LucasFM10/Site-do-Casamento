// Migrador e travas do banco: o papel do site só faz o que o código usa,
// mesmo que o código do site erre. O dono do banco (pessoas, pelo psql ou
// painel) passa pelas travas.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Ambiente, codigo, Postgres, pular } from "./ambiente.mjs";

const SEM_PERMISSAO = "42501";
const CHECK = "23514";
const CHAVE_ESTRANGEIRA = "23503";

describe("migrador e permissões do banco", { skip: pular }, () => {
  const pg = new Postgres();
  let amb, dono, site;
  const d = {};

  before(async () => {
    await pg.iniciar();
    amb = new Ambiente(pg);
    await amb.criar();
    const r = amb.migrar();
    assert.equal(r.status, 0, r.log);
    dono = amb.comoDono();
    site = amb.comoSite();

    [d.presente] = await dono`insert into presentes (nome, preco_centavos, ativo) values ('Jogo de panelas', 35000, true) returning id`;
    [d.outro] = await dono`insert into presentes (nome, preco_centavos) values ('Liquidificador', 20000) returning id`;
  });

  after(async () => {
    await amb?.limpar();
    await pg.parar();
  });

  test("o migrador pode rodar de novo sem mudar nada", () => {
    const r = amb.migrar();
    assert.equal(r.status, 0, r.log);
    assert.match(r.log, /Migrações aplicadas/);
    assert.doesNotMatch(r.log, new RegExp(amb.site.senha));
  });

  test("o site registra confirmações, mas não altera nem apaga", async () => {
    const [c] = await site`insert into confirmacoes (nome_completo, telefone, resposta)
      values ('Ana Souza', '5583999990001', 'sim') returning id`;
    assert.ok(c.id);
    assert.equal(await codigo(site`update confirmacoes set resposta = 'nao' where id = ${c.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`delete from confirmacoes where id = ${c.id}`), SEM_PERMISSAO);
  });

  test("checks recusam confirmação inválida", async () => {
    const nova = (nome, telefone, resposta) =>
      site`insert into confirmacoes (nome_completo, telefone, resposta) values (${nome}, ${telefone}, ${resposta})`;
    assert.equal(await codigo(nova("Ana Souza", "83999990001", "sim")), CHECK);
    assert.equal(await codigo(nova("Ana Souza", "5503999990001", "sim")), CHECK);
    assert.equal(await codigo(nova("Ana Souza", "5583999990001", "talvez")), CHECK);
    assert.equal(await codigo(nova("A", "5583999990001", "sim")), CHECK);
  });

  test("administrador só é criado pelo dono do banco", async () => {
    assert.equal(
      await codigo(site`insert into administradores (nome, telefone) values ('Intruso', '5583999990002')`),
      SEM_PERMISSAO,
    );
    const [adm] = await dono`insert into administradores (nome, telefone) values ('Lucas', '5583999990003') returning id`;
    assert.equal(await codigo(site`update administradores set ativo = false where id = ${adm.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`delete from administradores where id = ${adm.id}`), SEM_PERMISSAO);
    const [lido] = await site`select nome from administradores where id = ${adm.id}`;
    assert.equal(lido.nome, "Lucas");
  });

  test("o painel cadastra, edita e apaga presentes, sem trocar id nem datas de criação", async () => {
    const [p] = await site`insert into presentes (nome, preco_centavos, quantidade_maxima) values ('Torradeira', 15000, 1) returning id`;
    assert.equal(
      await codigo(site`update presentes set nome = 'Torradeira inox', preco_centavos = 16000, ativo = true,
        ordem = 3, quantidade_maxima = null, removido_em = null, atualizado_em = now() where id = ${p.id}`),
      "ok",
    );
    assert.equal(await codigo(site`update presentes set criado_em = now() where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`update presentes set id = gen_random_uuid() where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`update presentes set quantidade_maxima = 0 where id = ${p.id}`), CHECK);
    assert.equal(await codigo(site`delete from presentes where id = ${p.id}`), "ok");
  });

  test("imagens: só JPEG/PNG/WebP, do grupo certo, apagadas junto com o presente", async () => {
    const [p] = await site`insert into presentes (nome, preco_centavos) values ('Com foto', 1000) returning id`;
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const nova = (grupo, presenteId, tipo = "image/jpeg", dados = bytes) => site`
      insert into imagens (grupo, presente_id, tipo, largura, altura, dados)
      values (${grupo}, ${presenteId}, ${tipo}, 800, 600, ${dados}) returning id`;

    const [img] = await nova("presente", p.id);
    assert.equal(await codigo(nova("carrossel", null)), "ok");
    assert.equal(await codigo(nova("presente", null)), CHECK);
    assert.equal(await codigo(nova("carrossel", p.id)), CHECK);
    assert.equal(await codigo(nova("carrossel", null, "image/svg+xml")), CHECK);
    assert.equal(await codigo(nova("carrossel", null, "image/jpeg", Buffer.alloc(1_500_001))), CHECK);
    assert.equal(await codigo(site`update imagens set ordem = 2 where id = ${img.id}`), "ok");
    assert.equal(await codigo(site`update imagens set dados = ${bytes} where id = ${img.id}`), SEM_PERMISSAO);

    await site`delete from presentes where id = ${p.id}`;
    const [{ total }] = await dono`select count(*)::int as total from imagens where id = ${img.id}`;
    assert.equal(total, 0);
  });

  test("configurações: o site grava e atualiza, com chave e tamanho conferidos", async () => {
    const grava = (chave, valor) => site`
      insert into configuracoes (chave, valor) values (${chave}, ${valor})
      on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()`;
    assert.equal(await codigo(grava("cidade", "Recife - PE")), "ok");
    assert.equal(await codigo(grava("cidade", "João Pessoa - PB")), "ok");
    const [c] = await site`select valor from configuracoes where chave = 'cidade'`;
    assert.equal(c.valor, "João Pessoa - PB");
    assert.equal(await codigo(grava("Chave Inválida", "x")), CHECK);
    assert.equal(await codigo(grava("texto_grande", "x".repeat(4001))), CHECK);
    assert.equal(await codigo(site`delete from configuracoes`), SEM_PERMISSAO);
  });

  test("login: senha conferida pelo pgcrypto, sessões e limites gravados pelo site", async () => {
    const [adm] = await dono`
      insert into administradores (nome, telefone, senha_hash)
      values ('Amanda', '5583999990009', crypt('senha-de-teste', gen_salt('bf', 6))) returning id`;
    const confere = (senha) => site`
      select senha_hash = crypt(${senha}, senha_hash) as ok from administradores where id = ${adm.id}`;
    assert.equal((await confere("senha-de-teste"))[0].ok, true);
    assert.equal((await confere("errada"))[0].ok, false);
    // O hash fictício (celular que não existe) também é aceito pelo crypt.
    const [ficticio] = await site`
      select crypt('x', '$2a$12$CasamentoLucasAmandaXXuSemSenhaUsuarioInexistente0000') is not null as ok`;
    assert.equal(ficticio.ok, true);
    assert.equal(await codigo(dono`update administradores set senha_hash = 'texto puro' where id = ${adm.id}`), CHECK);
    assert.equal(await codigo(site`update administradores set senha_hash = null where id = ${adm.id}`), SEM_PERMISSAO);

    const [s] = await site`
      insert into sessoes_admin (administrador_id, token_hash, expira_em)
      values (${adm.id}, 'hash-do-token', now() + interval '1 day') returning id`;
    assert.equal(await codigo(site`update sessoes_admin set expira_em = now() + interval '1 year' where id = ${s.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`delete from sessoes_admin where id = ${s.id}`), "ok");

    assert.equal(await codigo(site`insert into limite_tentativas (chave) values ('login:tel:5583999990009')`), "ok");
    assert.equal(await codigo(site`delete from limite_tentativas where chave = 'login:tel:5583999990009'`), "ok");
  });

  test("pedido nasce pendente e não troca valor, presente nem comprador", async () => {
    const novo = (status = "pendente") => site`
      insert into pedidos (presente_id, valor_centavos, meio, status, comprador_nome, comprador_email,
        external_reference, idempotency_key)
      values (${d.presente.id}, 35000, 'pix', ${status}, 'Bia Lima', 'bia@exemplo.com',
        gen_random_uuid()::text, gen_random_uuid()::text)
      returning id`;
    const [p] = await novo();
    assert.equal(await codigo(novo("aprovado")), SEM_PERMISSAO);

    assert.equal(await codigo(site`update pedidos set valor_centavos = 1 where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`update pedidos set presente_id = ${d.outro.id} where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`update pedidos set comprador_email = 'x@x.com' where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`update pedidos set mensagem = 'outra' where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`update pedidos set external_reference = 'x' where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(await codigo(site`delete from pedidos where id = ${p.id}`), SEM_PERMISSAO);
    assert.equal(
      await codigo(site`update pedidos set status = 'aprovado', mp_payment_id = '123', atualizado_em = now() where id = ${p.id}`),
      "ok",
    );
    // Presente com pedido não pode ser apagado (nem pelo dono): o painel o arquiva.
    assert.equal(await codigo(site`delete from presentes where id = ${d.presente.id}`), CHAVE_ESTRANGEIRA);
    assert.equal(await codigo(dono`delete from presentes where id = ${d.presente.id}`), CHAVE_ESTRANGEIRA);
  });

  test("webhook: evento único por origem e marcado como processado", async () => {
    const evento = () => site`insert into webhook_eventos (origem, evento_id) values ('mercadopago', 'ev-1')`;
    assert.equal(await codigo(evento()), "ok");
    assert.equal(await codigo(evento()), "23505");
    assert.equal(
      await codigo(site`update webhook_eventos set processado_em = now() where evento_id = 'ev-1'`),
      "ok",
    );
    assert.equal(await codigo(site`update webhook_eventos set evento_id = 'outro'`), SEM_PERMISSAO);
  });

  test("o site não mexe na estrutura nem no controle de migrações", async () => {
    assert.equal(await codigo(site`create table invasao (id int)`), SEM_PERMISSAO);
    assert.equal(await codigo(site`alter table confirmacoes add column x int`), SEM_PERMISSAO);
    assert.equal(await codigo(site`drop table pedidos`), SEM_PERMISSAO);
    assert.equal(await codigo(site`select * from drizzle.__drizzle_migrations`), SEM_PERMISSAO);
    assert.equal(await codigo(site`truncate confirmacoes`), SEM_PERMISSAO);
    assert.equal(await codigo(site.unsafe(`alter role ${amb.site.usuario} superuser`)), SEM_PERMISSAO);
  });

  test("trocar a senha do site pelo ambiente vale no próximo deploy", async () => {
    const nova = "senha-nova-do-site-rotacionada";
    const r = amb.migrar({ PGPASSWORD: nova });
    assert.equal(r.status, 0, r.log);
    const antiga = amb.comoSite();
    assert.equal(await codigo(antiga`select 1`), "28P01");
    const atual = amb.comoSite(nova);
    assert.equal(await codigo(atual`select 1`), "ok");
    assert.equal(amb.migrar().status, 0);
  });

  test("o migrador recusa usar o dono como papel do site", () => {
    const r = amb.migrar({ PGUSER: "dono" });
    assert.notEqual(r.status, 0);
    assert.match(r.log, /não pode ser o dono do banco/);
  });

  test("tabela nova sem permissões definidas para o migrador", async () => {
    await dono`create table tabela_esquecida (id int)`;
    const r = amb.migrar();
    assert.notEqual(r.status, 0);
    assert.match(r.log, /tabela_esquecida/);
    await dono`drop table tabela_esquecida`;
    assert.equal(amb.migrar().status, 0);
  });
});
