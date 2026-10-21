import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaWebhookValida } from "./mercadopago";

const segredo = "segredo-de-teste";
const assinar = (manifesto: string) => createHmac("sha256", segredo).update(manifesto).digest("hex");

describe("assinaturaWebhookValida", () => {
  it("aceita a assinatura do manifesto completo", () => {
    const v1 = assinar("id:123456;request-id:abc;ts:1700000000;");
    expect(
      assinaturaWebhookValida({ segredo, xSignature: `ts=1700000000,v1=${v1}`, xRequestId: "abc", dataId: "123456" }),
    ).toBe(true);
  });

  it("recusa assinatura de outro pagamento, ausente ou malformada", () => {
    const v1 = assinar("id:123456;request-id:abc;ts:1700000000;");
    const base = { segredo, xRequestId: "abc", dataId: "999" };
    expect(assinaturaWebhookValida({ ...base, xSignature: `ts=1700000000,v1=${v1}` })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, xSignature: null })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, xSignature: "ts=1700000000" })).toBe(false);
  });

  it("monta o manifesto sem as partes ausentes e com o id em minúsculas", () => {
    const v1 = assinar("id:abc123;ts:1;");
    expect(assinaturaWebhookValida({ segredo, xSignature: `ts=1,v1=${v1}`, xRequestId: null, dataId: "ABC123" })).toBe(
      true,
    );
  });
});
