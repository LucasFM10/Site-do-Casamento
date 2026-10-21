import { isValidBrazilianPhone, toStoredBrazilianPhone } from "@/lib/phone";
import { lerReais } from "@/lib/dinheiro";

/**
 * Validação dos formulários de presentes: cadastro no painel e compra pelo
 * convidado. Compartilhado entre servidor e navegador; o servidor sempre
 * valida de novo.
 */

const texto = (valor: FormDataEntryValue | null | undefined) => (typeof valor === "string" ? valor : "");
const linha = (valor: FormDataEntryValue | null | undefined) => texto(valor).trim().replace(/\s+/g, " ");

export type DadosPresente = {
  nome: string;
  descricao: string;
  precoCentavos: number;
  quantidadeMaxima: number | null;
  ativo: boolean;
};

export type ErrosPresente = Partial<Record<"nome" | "descricao" | "preco" | "quantidadeMaxima", string>>;

export function validarPresente(form: FormData): { ok: true; dados: DadosPresente } | { ok: false; erros: ErrosPresente } {
  const erros: ErrosPresente = {};
  const nome = linha(form.get("nome"));
  const descricao = texto(form.get("descricao")).replace(/\r\n/g, "\n").trim();
  const precoCentavos = lerReais(texto(form.get("preco")));
  const quantidadeTexto = linha(form.get("quantidadeMaxima"));
  let quantidadeMaxima: number | null = null;

  if (!nome) erros.nome = "Informe o nome do presente.";
  else if (nome.length > 160) erros.nome = "Use até 160 caracteres.";
  if (descricao.length > 2000) erros.descricao = "Use até 2000 caracteres.";
  if (precoCentavos === null) erros.preco = "Informe um valor válido, por exemplo 150,00.";
  if (quantidadeTexto) {
    quantidadeMaxima = Number(quantidadeTexto);
    if (!Number.isInteger(quantidadeMaxima) || quantidadeMaxima < 1 || quantidadeMaxima > 10_000) {
      erros.quantidadeMaxima = "Use um número inteiro a partir de 1, ou deixe em branco.";
    }
  }

  if (Object.keys(erros).length) return { ok: false, erros };
  return {
    ok: true,
    dados: { nome, descricao, precoCentavos: precoCentavos!, quantidadeMaxima, ativo: form.get("ativo") === "on" },
  };
}

export type DadosComprador = {
  nome: string;
  email: string;
  /** 55 + DDD + número, ou vazio. */
  telefone: string;
  mensagem: string;
};

export type ErrosComprador = Partial<Record<keyof DadosComprador, string>>;

export const MAX_MENSAGEM = 1000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarComprador(
  form: FormData,
): { ok: true; dados: DadosComprador } | { ok: false; erros: ErrosComprador } {
  const erros: ErrosComprador = {};
  const nome = linha(form.get("nome"));
  const email = linha(form.get("email")).toLowerCase();
  const celular = linha(form.get("celular"));
  const mensagem = texto(form.get("mensagem")).replace(/\r\n/g, "\n").trim();

  if (nome.length < 2 || nome.length > 120) erros.nome = "Informe seu nome.";
  if (email.length > 254 || !EMAIL.test(email)) erros.email = "Informe um e-mail válido.";
  if (celular && !isValidBrazilianPhone(celular)) erros.telefone = "Informe um celular válido com DDD, ou deixe em branco.";
  if (mensagem.length > MAX_MENSAGEM) erros.mensagem = `Use até ${MAX_MENSAGEM} caracteres.`;

  if (Object.keys(erros).length) return { ok: false, erros };
  return {
    ok: true,
    dados: { nome, email, telefone: celular ? toStoredBrazilianPhone(celular) : "", mensagem },
  };
}
