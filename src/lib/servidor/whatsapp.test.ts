import { afterEach, describe, expect, it, vi } from "vitest";
import { avisarPorWhatsapp, preencherModelo } from "./whatsapp";

describe("preencherModelo", () => {
  it("troca as chaves conhecidas e mantém as desconhecidas", () => {
    expect(preencherModelo("Olá, {nome}! {outra}", { nome: "Ana" })).toBe("Olá, Ana! {outra}");
  });

  it('converte "\n" em quebra de linha', () => {
    expect(preencherModelo("Linha 1\nLinha 2", {})).toBe("Linha 1\nLinha 2");
  });
});

describe("avisarPorWhatsapp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("não envia sem modelo ou sem Evolution API configurada", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("WHATSAPP_MSG_CONFIRMACAO_SIM", "");
    vi.stubEnv("EVOLUTION_API_URL", "evo.exemplo.com");
    vi.stubEnv("EVOLUTION_API_KEY", "chave");
    vi.stubEnv("EVOLUTION_INSTANCE", "casamento");
    expect(await avisarPorWhatsapp("WHATSAPP_MSG_CONFIRMACAO_SIM", "5583999998888", {})).toBe(false);

    vi.stubEnv("WHATSAPP_MSG_CONFIRMACAO_SIM", "Oi");
    vi.stubEnv("EVOLUTION_API_KEY", "");
    expect(await avisarPorWhatsapp("WHATSAPP_MSG_CONFIRMACAO_SIM", "5583999998888", {})).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("envia pela Evolution API e não lança quando ela falha", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("ok")).mockResolvedValueOnce(new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetch);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("WHATSAPP_MSG_CONFIRMACAO_SIM", "Olá, {nome}!");
    vi.stubEnv("EVOLUTION_API_URL", "evo.exemplo.com/");
    vi.stubEnv("EVOLUTION_API_KEY", "chave");
    vi.stubEnv("EVOLUTION_INSTANCE", "casamento");

    expect(await avisarPorWhatsapp("WHATSAPP_MSG_CONFIRMACAO_SIM", "5583999998888", { nome: "Ana" })).toBe(true);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://evo.exemplo.com/message/sendText/casamento");
    expect(init.headers.apikey).toBe("chave");
    expect(JSON.parse(init.body)).toEqual({ number: "5583999998888", text: "Olá, Ana!" });

    expect(await avisarPorWhatsapp("WHATSAPP_MSG_CONFIRMACAO_SIM", "5583999998888", { nome: "Ana" })).toBe(false);
  });
});
