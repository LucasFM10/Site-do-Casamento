import { describe, expect, it } from "vitest";
import { listaDeIds, mesmoConjunto } from "./banco";

const A = "0b9d3f7e-8f3e-4c6a-9d1e-2a7b5c4d3e2f";
const B = "1c8e2a6d-7f2d-4b5a-8c0d-1f6a4b3c2d1e";
const C = "2d7f1b5c-6e1c-4a49-9b2c-0e5f3a2b1c0d";

describe("listaDeIds", () => {
  it("aceita ids válidos e sem repetição", () => {
    expect(listaDeIds([A, B, C])).toBe(true);
    expect(listaDeIds([])).toBe(true);
  });

  it("recusa repetição, id inválido e o que não é lista", () => {
    expect(listaDeIds([A, A])).toBe(false);
    expect(listaDeIds([A, "1 or 1=1"])).toBe(false);
    expect(listaDeIds(A)).toBe(false);
    expect(listaDeIds(null)).toBe(false);
    expect(listaDeIds(Array(501).fill(A))).toBe(false);
  });
});

describe("mesmoConjunto", () => {
  it("aceita os mesmos itens em outra ordem", () => {
    expect(mesmoConjunto([A, B, C], [C, A, B])).toBe(true);
  });

  it("recusa item faltando, sobrando ou trocado", () => {
    expect(mesmoConjunto([A, B, C], [A, B])).toBe(false);
    expect(mesmoConjunto([A, B], [A, B, C])).toBe(false);
    expect(mesmoConjunto([A, B], [A, C])).toBe(false);
  });
});
