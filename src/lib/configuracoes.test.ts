import { describe, expect, it } from "vitest";
import {
  CONFIGURACOES_PADRAO,
  dataPorExtenso,
  horarioPorExtenso,
  inicioDaCerimonia,
  mesclarConfiguracoes,
  preencherTexto,
  validarConfiguracoes,
} from "./configuracoes";

describe("validarConfiguracoes", () => {
  it("aceita os valores padrão", () => {
    expect(validarConfiguracoes({ ...CONFIGURACOES_PADRAO }).ok).toBe(true);
  });

  it("aponta campo obrigatório, data, hora e link inválidos", () => {
    const r = validarConfiguracoes({
      ...CONFIGURACOES_PADRAO,
      nome_1: "  ",
      data_casamento: "2027-02-30",
      cerimonia_horario: "25:00",
      cerimonia_mapa: "javascript:alert(1)",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.erros).sort()).toEqual(["cerimonia_horario", "cerimonia_mapa", "data_casamento", "nome_1"]);
  });

  it("limpa espaços e respeita o tamanho máximo", () => {
    const r = validarConfiguracoes({ ...CONFIGURACOES_PADRAO, cidade: "  João   Pessoa  " });
    expect(r.ok && r.valores.cidade).toBe("João Pessoa");
    expect(validarConfiguracoes({ ...CONFIGURACOES_PADRAO, cidade: "x".repeat(81) }).ok).toBe(false);
  });

  it("ignora chaves desconhecidas e trata ausentes como vazias", () => {
    const r = validarConfiguracoes({ nome_1: "Lucas", nome_2: "Amanda", data_casamento: "2027-01-23", extra: "x" });
    expect(r.ok).toBe(true);
    expect(r.ok && r.valores.cidade).toBe("");
    expect(r.ok && "extra" in r.valores).toBe(false);
  });
});

describe("mesclarConfiguracoes", () => {
  it("usa o banco sobre o padrão e volta ao padrão quando o valor é inválido", () => {
    const c = mesclarConfiguracoes([
      { chave: "cidade", valor: "Recife - PE" },
      { chave: "data_casamento", valor: "não é data" },
      { chave: "desconhecida", valor: "x" },
    ]);
    expect(c.cidade).toBe("Recife - PE");
    expect(c.data_casamento).toBe(CONFIGURACOES_PADRAO.data_casamento);
    expect("desconhecida" in c).toBe(false);
  });
});

describe("textos", () => {
  it("escreve data e horário por extenso", () => {
    expect(dataPorExtenso("2027-01-23")).toBe("23 de Janeiro de 2027");
    expect(horarioPorExtenso("11:30")).toBe("11h30");
    expect(horarioPorExtenso("09:00")).toBe("9h");
    expect(horarioPorExtenso("")).toBe("");
  });

  it("calcula o início da cerimônia no horário de Brasília", () => {
    const inicio = inicioDaCerimonia({ data_casamento: "2027-01-23", cerimonia_horario: "11:30" });
    expect(new Date(inicio).toISOString()).toBe("2027-01-23T14:30:00.000Z");
    expect(inicioDaCerimonia({ data_casamento: "2027-01-23", cerimonia_horario: "" })).toBe("2027-01-23T00:00:00-03:00");
  });

  it("preenche {nome} e mantém o resto", () => {
    expect(preencherTexto("Obrigado, {nome}! {outro}", { nome: "Ana" })).toBe("Obrigado, Ana! {outro}");
  });
});
