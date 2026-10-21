"use server";

import { redirect } from "next/navigation";
import { isValidBrazilianPhone, toStoredBrazilianPhone } from "@/lib/phone";
import { entrar } from "@/lib/servidor/admin";
import { mensagemDoErro } from "@/lib/servidor/banco";
import { ipDoCliente } from "@/lib/servidor/requisicao";

export type EstadoLogin = { erro?: string };

const INCORRETO = "Celular ou senha incorretos.";

export async function entrarNoPainel(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const celular = String(form.get("celular") || "");
  const senha = String(form.get("senha") || "");
  if (!isValidBrazilianPhone(celular) || !senha || senha.length > 200) return { erro: INCORRETO };

  let resultado: Awaited<ReturnType<typeof entrar>>;
  try {
    resultado = await entrar(toStoredBrazilianPhone(celular), senha, await ipDoCliente());
  } catch (erro) {
    console.error("Login do painel: falha.", mensagemDoErro(erro));
    return { erro: "Não foi possível entrar agora. Tente novamente em instantes." };
  }

  if (resultado === "bloqueado") return { erro: "Muitas tentativas. Aguarde 15 minutos e tente de novo." };
  if (resultado === "invalido") return { erro: INCORRETO };
  redirect("/admin");
}
