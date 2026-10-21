import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confirmarPagamentoMp = vi.fn();
const registrarEvento = vi.fn();
const concluirEvento = vi.fn();
vi.mock("@/lib/servidor/pedidos", () => ({ confirmarPagamentoMp }));
vi.mock("@/lib/servidor/webhooks", () => ({ registrarEvento, concluirEvento }));

const { POST } = await import("./route");

const SEGREDO = "segredo-do-webhook";

function notificacao(dataId: string, { segredo = SEGREDO, corpo }: { segredo?: string; corpo?: object } = {}) {
  const ts = "1700000000";
  const v1 = createHmac("sha256", segredo).update(`id:${dataId};request-id:req-1;ts:${ts};`).digest("hex");
  return new Request(`https://site.exemplo/api/mercadopago/webhook?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": "req-1" },
    body: JSON.stringify(corpo ?? { id: 42, type: "payment", action: "payment.updated", data: { id: dataId } }),
  });
}

describe("webhook do Mercado Pago", () => {
  beforeEach(() => {
    vi.stubEnv("MP_WEBHOOK_SECRET", SEGREDO);
    registrarEvento.mockResolvedValue("novo");
    confirmarPagamentoMp.mockResolvedValue("aprovado");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("confirma o pagamento pelo id e marca o evento como processado", async () => {
    const r = await POST(notificacao("123456"));
    expect(r.status).toBe(200);
    expect(confirmarPagamentoMp).toHaveBeenCalledWith("123456");
    expect(concluirEvento).toHaveBeenCalledWith("mercadopago", "42");
  });

  it("recusa assinatura inválida sem tocar em nada", async () => {
    const r = await POST(notificacao("123456", { segredo: "outro" }));
    expect(r.status).toBe(401);
    expect(registrarEvento).not.toHaveBeenCalled();
    expect(confirmarPagamentoMp).not.toHaveBeenCalled();
  });

  it("sem o segredo configurado, responde 503", async () => {
    vi.stubEnv("MP_WEBHOOK_SECRET", "");
    expect((await POST(notificacao("123456"))).status).toBe(503);
  });

  it("não processa a mesma notificação duas vezes", async () => {
    registrarEvento.mockResolvedValue("repetido");
    const r = await POST(notificacao("123456"));
    expect(r.status).toBe(200);
    expect(confirmarPagamentoMp).not.toHaveBeenCalled();
  });

  it("erro no processamento responde 500 para o Mercado Pago tentar de novo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    confirmarPagamentoMp.mockRejectedValue(new Error("Mercado Pago fora do ar"));
    const r = await POST(notificacao("123456"));
    expect(r.status).toBe(500);
    expect(concluirEvento).not.toHaveBeenCalled();
  });
});
