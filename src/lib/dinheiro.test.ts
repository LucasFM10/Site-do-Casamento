import { describe, expect, it } from "vitest";
import { formatarReais, lerReais, reaisParaCampo } from "./dinheiro";

describe("lerReais", () => {
  it("lê os jeitos comuns de digitar um valor", () => {
    expect(lerReais("150")).toBe(15000);
    expect(lerReais("150,5")).toBe(15050);
    expect(lerReais("150,50")).toBe(15050);
    expect(lerReais("R$ 1.500,00")).toBe(150000);
    expect(lerReais("1.500")).toBe(150000);
    expect(lerReais("99.90")).toBe(9990);
    expect(lerReais(" 0,01 ")).toBe(1);
  });

  it("recusa zero, negativo, texto e mais de duas casas", () => {
    expect(lerReais("")).toBeNull();
    expect(lerReais("0")).toBeNull();
    expect(lerReais("-10")).toBeNull();
    expect(lerReais("dez")).toBeNull();
    expect(lerReais("10,999")).toBeNull();
    expect(lerReais("1e3")).toBeNull();
    expect(lerReais("2.000.000,00")).toBeNull();
  });
});

describe("formatação", () => {
  it("formata em reais e para o campo do painel", () => {
    expect(formatarReais(150000).replace(/\s/g, " ")).toBe("R$ 1.500,00");
    expect(reaisParaCampo(15050)).toBe("150,50");
  });
});
