import { describe, expect, it } from "vitest";
import { validarComprador, validarPresente } from "./presentes";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("validarPresente", () => {
  it("lê nome, valor em reais, quantidade e disponibilidade", () => {
    const r = validarPresente(form({ nome: " Jogo  de panelas ", preco: "350,00", quantidadeMaxima: "2", ativo: "on" }));
    expect(r).toEqual({
      ok: true,
      dados: { nome: "Jogo de panelas", descricao: "", precoCentavos: 35000, quantidadeMaxima: 2, ativo: true },
    });
  });

  it("quantidade em branco é sem limite; sem a caixa marcada fica oculto", () => {
    const r = validarPresente(form({ nome: "Cafeteira", preco: "200" }));
    expect(r.ok && r.dados).toMatchObject({ quantidadeMaxima: null, ativo: false });
  });

  it("aponta nome, valor e quantidade inválidos", () => {
    const r = validarPresente(form({ nome: "", preco: "0", quantidadeMaxima: "1,5" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.erros).sort()).toEqual(["nome", "preco", "quantidadeMaxima"]);
  });
});

describe("validarComprador", () => {
  it("aceita só nome e e-mail; celular vira o formato do banco", () => {
    expect(validarComprador(form({ nome: "Bia", email: "BIA@Exemplo.com " }))).toEqual({
      ok: true,
      dados: { nome: "Bia", email: "bia@exemplo.com", telefone: "", mensagem: "" },
    });
    const r = validarComprador(form({ nome: "Bia Lima", email: "bia@exemplo.com", celular: "(83) 99999-8888", mensagem: " Felicidades! " }));
    expect(r.ok && r.dados).toMatchObject({ telefone: "5583999998888", mensagem: "Felicidades!" });
  });

  it("recusa nome curto, e-mail inválido, celular inválido e mensagem longa", () => {
    const r = validarComprador(form({ nome: "B", email: "bia@", celular: "123", mensagem: "x".repeat(1001) }));
    expect(!r.ok && Object.keys(r.erros).sort()).toEqual(["email", "mensagem", "nome", "telefone"]);
  });
});
