import { describe, expect, it } from "vitest";
import { ipDosCabecalhos } from "./requisicao";

describe("ipDosCabecalhos", () => {
  it("usa o último endereço de X-Forwarded-For (o que o proxy viu)", () => {
    expect(ipDosCabecalhos("1.1.1.1, 203.0.113.9", null)).toBe("203.0.113.9");
    expect(ipDosCabecalhos("2001:DB8::1", null)).toBe("2001:db8::1");
  });

  it("cai para X-Real-IP e recusa valores estranhos", () => {
    expect(ipDosCabecalhos(null, "198.51.100.7")).toBe("198.51.100.7");
    expect(ipDosCabecalhos(null, null)).toBe("desconhecido");
    expect(ipDosCabecalhos("<script>", null)).toBe("desconhecido");
  });
});
