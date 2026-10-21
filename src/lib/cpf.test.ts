import { describe, expect, it } from "vitest";
import { normalizarCpf } from "./cpf";

describe("normalizarCpf", () => {
  it("aceita CPF válido com ou sem pontuação", () => {
    expect(normalizarCpf("529.982.247-25")).toBe("52998224725");
  });

  it("recusa dígito verificador errado e sequências repetidas", () => {
    expect(normalizarCpf("529.982.247-26")).toBeNull();
    expect(normalizarCpf("111.111.111-11")).toBeNull();
  });
});
