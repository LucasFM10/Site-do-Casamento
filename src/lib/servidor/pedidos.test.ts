import { afterEach, describe, expect, it, vi } from "vitest";
import { decidirStatus } from "./pedidos";

const pedido = {
  id: "pedido-1",
  status: "pendente" as const,
  valorCentavos: 35000,
  externalReference: "ref-1",
  mpPaymentId: "123",
};

const pagamento = (extra: Record<string, unknown> = {}) => ({
  id: 123,
  status: "approved",
  external_reference: "ref-1",
  transaction_amount: 350,
  currency_id: "BRL",
  ...extra,
});

describe("decidirStatus", () => {
  afterEach(() => vi.restoreAllMocks());

  it("aprova quando referência, id, valor e moeda conferem", () => {
    expect(decidirStatus(pedido, pagamento())).toBe("aprovado");
  });

  it("traduz os status do Mercado Pago", () => {
    expect(decidirStatus(pedido, pagamento({ status: "rejected" }))).toBe("recusado");
    expect(decidirStatus(pedido, pagamento({ status: "cancelled" }))).toBe("cancelado");
    expect(decidirStatus({ ...pedido, status: "aprovado" }, pagamento({ status: "refunded" }))).toBe("reembolsado");
    expect(decidirStatus(pedido, pagamento({ status: "in_process" }))).toBeNull();
  });

  it("não aprova valor, moeda ou pagamento de outro pedido", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(decidirStatus(pedido, pagamento({ transaction_amount: 1 }))).toBeNull();
    expect(decidirStatus(pedido, pagamento({ currency_id: "USD" }))).toBeNull();
    expect(decidirStatus(pedido, pagamento({ external_reference: "ref-2" }))).toBeNull();
    expect(decidirStatus(pedido, pagamento({ id: 999 }))).toBeNull();
  });

  it("pedido aprovado não volta para pendente nem se repete", () => {
    const aprovado = { ...pedido, status: "aprovado" as const };
    expect(decidirStatus(aprovado, pagamento({ status: "pending" }))).toBeNull();
    expect(decidirStatus(aprovado, pagamento())).toBeNull();
  });
});
