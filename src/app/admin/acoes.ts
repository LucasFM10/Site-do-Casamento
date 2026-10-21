"use server";

/**
 * Ações do painel. Cada função exportada aqui é um endpoint público do
 * Next: todas começam com exigirAdmin(), que confere a sessão no servidor.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validarConfiguracoes } from "@/lib/configuracoes";
import { validarPresente } from "@/lib/presentes";
import { exigirAdmin, sair } from "@/lib/servidor/admin";
import { idValido, mensagemDoErro } from "@/lib/servidor/banco";
import { salvarConfiguracoes } from "@/lib/servidor/configuracoes";
import { apagarImagem, guardarImagem, moverImagem, validarImagem, type ErroImagem } from "@/lib/servidor/imagens";
import { confirmarPagamento, mercadoPagoConfigurado } from "@/lib/servidor/pedidos";
import {
  atualizarPresente,
  criarPresente,
  definirAtivo,
  moverPresente,
  obterPresenteAdmin,
  removerPresente,
} from "@/lib/servidor/presentes";

export type Resultado = { ok?: boolean; mensagem?: string; erro?: string; erros?: Record<string, string> };

const texto = (form: FormData, nome: string) => String(form.get(nome) ?? "");
const direcao = (form: FormData) => (texto(form, "direcao") === "subir" ? -1 : 1);

/** Página inicial, vitrine e painel mostram dados novos na próxima visita. */
function atualizarPaginas() {
  revalidatePath("/", "layout");
}

export async function sairDoPainel() {
  await sair();
  redirect("/admin/login");
}

// --- Presentes -----------------------------------------------------------

export async function salvarPresente(_anterior: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const validacao = validarPresente(form);
  if (!validacao.ok) return { erros: validacao.erros };

  const id = texto(form, "id");
  let novoId: string;
  try {
    if (id) {
      if (!(await atualizarPresente(id, validacao.dados))) return { erro: "Presente não encontrado." };
      atualizarPaginas();
      return { ok: true, mensagem: "Presente salvo." };
    }
    novoId = await criarPresente(validacao.dados);
  } catch (erro) {
    console.error("Painel: falha ao salvar presente.", mensagemDoErro(erro));
    return { erro: "Não foi possível salvar. Tente novamente." };
  }
  atualizarPaginas();
  redirect(`/admin/presentes/${novoId}?novo=1`);
}

export async function removerPresenteAcao(form: FormData) {
  await exigirAdmin();
  await removerPresente(texto(form, "id"));
  atualizarPaginas();
  redirect("/admin/presentes");
}

export async function moverPresenteAcao(form: FormData) {
  await exigirAdmin();
  await moverPresente(texto(form, "id"), direcao(form));
  atualizarPaginas();
}

export async function definirAtivoAcao(form: FormData) {
  await exigirAdmin();
  await definirAtivo(texto(form, "id"), texto(form, "ativo") === "1");
  atualizarPaginas();
}

// --- Imagens -------------------------------------------------------------

const ERROS_IMAGEM: Record<ErroImagem, string> = {
  tamanho: "A imagem ficou grande demais. Tente outra foto.",
  tipo: "Formato não aceito. Use JPEG, PNG ou WebP.",
  dimensoes: "Não foi possível ler as dimensões da imagem.",
};

export async function enviarImagemAcao(form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const grupo = texto(form, "grupo");
  const presenteId = texto(form, "presenteId");
  const arquivo = form.get("arquivo");
  if (grupo !== "presente" && grupo !== "carrossel") return { erro: "Destino da imagem inválido." };
  if (!(arquivo instanceof File)) return { erro: "Nenhuma imagem recebida." };

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const largura = Number(texto(form, "largura"));
  const altura = Number(texto(form, "altura"));
  const imagem = validarImagem(bytes, largura, altura);
  if (!imagem.ok) return { erro: ERROS_IMAGEM[imagem.erro] };

  try {
    if (grupo === "presente" && !(idValido(presenteId) && (await obterPresenteAdmin(presenteId)))) {
      return { erro: "Presente não encontrado." };
    }
    await guardarImagem({
      grupo,
      presenteId: grupo === "presente" ? presenteId : null,
      bytes,
      tipo: imagem.tipo,
      largura,
      altura,
    });
  } catch (erro) {
    console.error("Painel: falha ao guardar imagem.", mensagemDoErro(erro));
    return { erro: "Não foi possível guardar a imagem. Tente novamente." };
  }
  atualizarPaginas();
  return { ok: true };
}

export async function moverImagemAcao(form: FormData) {
  await exigirAdmin();
  await moverImagem(texto(form, "id"), direcao(form));
  atualizarPaginas();
}

export async function apagarImagemAcao(form: FormData) {
  await exigirAdmin();
  await apagarImagem(texto(form, "id"));
  atualizarPaginas();
}

// --- Informações do site -------------------------------------------------

export async function salvarInformacoes(_anterior: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const validacao = validarConfiguracoes(Object.fromEntries(form));
  if (!validacao.ok) return { erros: validacao.erros, erro: "Confira os campos destacados." };
  try {
    await salvarConfiguracoes(validacao.valores);
  } catch (erro) {
    console.error("Painel: falha ao salvar informações.", mensagemDoErro(erro));
    return { erro: "Não foi possível salvar. Tente novamente." };
  }
  atualizarPaginas();
  return { ok: true, mensagem: "Informações salvas. A página inicial já mostra as mudanças." };
}

// --- Pedidos -------------------------------------------------------------

/** Consulta o pagamento no Mercado Pago (caso o webhook não tenha chegado). */
export async function verificarPagamentoAcao(form: FormData) {
  await exigirAdmin();
  const id = texto(form, "id");
  if (!idValido(id) || !mercadoPagoConfigurado()) return;
  try {
    await confirmarPagamento(id);
  } catch (erro) {
    console.error(`Painel: falha ao verificar o pedido ${id}.`, mensagemDoErro(erro));
  }
  revalidatePath("/admin/pedidos");
}
