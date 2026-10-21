import { describe, expect, it } from "vitest";
import {
  consolidarConfirmacoes,
  filtrarConvidados,
  indicadoresDePresenca,
  type LinhaConfirmacao,
} from "./confirmacoes";

let seq = 0;
const linha = (nome: string, telefone: string, resposta: "sim" | "nao", minuto: number): LinhaConfirmacao => ({
  id: String(++seq),
  nomeCompleto: nome,
  telefone,
  resposta,
  criadoEm: new Date(Date.UTC(2026, 9, 1, 12, minuto)),
});

const linhas = [
  linha("Ana Souza", "5583999990001", "sim", 0),
  // Mesma pessoa, escrita diferente, mudou de ideia depois.
  linha("ana  SOUZA", "5583999990001", "nao", 10),
  // Mesmo celular, outra pessoa da família.
  linha("João Souza", "5583999990001", "sim", 5),
  linha("Bruno Lima", "5583999990002", "sim", 1),
  linha("Bruno Lima", "5583999990002", "sim", 2),
  linha("Clara Dias", "5583999990003", "nao", 3),
];

describe("consolidarConfirmacoes", () => {
  const convidados = consolidarConfirmacoes(linhas);

  it("agrupa por celular e nome sem acento nem caixa, valendo a resposta mais recente", () => {
    expect(convidados.map((c) => [c.nome, c.resposta])).toEqual([
      ["ana  SOUZA", "nao"],
      ["Bruno Lima", "sim"],
      ["Clara Dias", "nao"],
      ["João Souza", "sim"],
    ]);
  });

  it("guarda o histórico completo, do mais recente ao mais antigo", () => {
    const ana = convidados.find((c) => c.telefone === "5583999990001" && c.resposta === "nao")!;
    expect(ana.historico.map((h) => h.resposta)).toEqual(["nao", "sim"]);
    expect(ana.mudouDeIdeia).toBe(true);
    expect(convidados.find((c) => c.nome === "Bruno Lima")!.mudouDeIdeia).toBe(false);
  });

  it("conta presença por convidado, não por resposta", () => {
    expect(indicadoresDePresenca(convidados)).toEqual({
      convidados: 4,
      confirmados: 2,
      recusados: 2,
      respostas: 6,
      repetidos: 2,
    });
  });

  it("filtra por resposta, por nome sem acento e por dígitos do celular", () => {
    expect(filtrarConvidados(convidados, { resposta: "sim" }).map((c) => c.nome)).toEqual(["Bruno Lima", "João Souza"]);
    expect(filtrarConvidados(convidados, { busca: "joao" }).map((c) => c.nome)).toEqual(["João Souza"]);
    expect(filtrarConvidados(convidados, { busca: "(83) 99999-0003" }).map((c) => c.nome)).toEqual(["Clara Dias"]);
    expect(filtrarConvidados(convidados, { busca: "souza", resposta: "nao" })).toHaveLength(1);
  });
});
