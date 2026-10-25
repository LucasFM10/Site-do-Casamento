import { describe, expect, it, vi } from "vitest";

// Sem sessão: exigirAdmin redireciona (no Next, lança NEXT_REDIRECT).
vi.mock("@/lib/servidor/admin", () => ({
  exigirAdmin: vi.fn(async () => {
    throw new Error("NEXT_REDIRECT");
  }),
  sair: vi.fn(),
}));

// Tudo o que escreve no banco ou fala com o Mercado Pago vira espião.
const espioes = vi.hoisted(() => ({
  salvarConfiguracoes: vi.fn(),
  apagarImagem: vi.fn(),
  guardarImagem: vi.fn(),
  reordenarImagens: vi.fn(),
  confirmarPagamento: vi.fn(),
  atualizarPresente: vi.fn(),
  criarPresente: vi.fn(),
  definirAtivo: vi.fn(),
  obterPresenteAdmin: vi.fn(),
  removerPresente: vi.fn(),
  reordenarPresentes: vi.fn(),
}));
vi.mock("@/lib/servidor/configuracoes", () => ({ salvarConfiguracoes: espioes.salvarConfiguracoes }));
vi.mock("@/lib/servidor/imagens", async (original) => ({
  ...(await original<typeof import("@/lib/servidor/imagens")>()),
  apagarImagem: espioes.apagarImagem,
  guardarImagem: espioes.guardarImagem,
  reordenarImagens: espioes.reordenarImagens,
}));
vi.mock("@/lib/servidor/pedidos", () => ({
  confirmarPagamento: espioes.confirmarPagamento,
  mercadoPagoConfigurado: () => true,
}));
vi.mock("@/lib/servidor/presentes", () => ({
  atualizarPresente: espioes.atualizarPresente,
  criarPresente: espioes.criarPresente,
  definirAtivo: espioes.definirAtivo,
  obterPresenteAdmin: espioes.obterPresenteAdmin,
  removerPresente: espioes.removerPresente,
  reordenarPresentes: espioes.reordenarPresentes,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const acoes = await import("./acoes");

/** Formulário válido para cada ação, para a recusa vir da sessão e não da validação. */
function formulario() {
  const f = new FormData();
  f.set("id", "0b9d3f7e-8f3e-4c6a-9d1e-2a7b5c4d3e2f");
  f.set("nome", "Jogo de panelas");
  f.set("preco", "350,00");
  f.set("grupo", "carrossel");
  f.set("largura", "800");
  f.set("altura", "600");
  f.set("arquivo", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "foto.jpg"));
  return f;
}

describe("ações do painel", () => {
  const nomes = Object.keys(acoes).filter((n) => n !== "sairDoPainel" && typeof acoes[n as keyof typeof acoes] === "function");

  it("cobre todas as ações exportadas", () => {
    expect(nomes.length).toBeGreaterThanOrEqual(9);
  });

  it.each(nomes)("%s exige administrador antes de qualquer escrita", async (nome) => {
    const acao = acoes[nome as keyof typeof acoes] as (...args: unknown[]) => Promise<unknown>;
    const args = acao.length >= 2 ? [{}, formulario()] : [formulario()];
    await expect(acao(...args)).rejects.toThrow("NEXT_REDIRECT");
    for (const espiao of Object.values(espioes)) expect(espiao).not.toHaveBeenCalled();
  });
});
