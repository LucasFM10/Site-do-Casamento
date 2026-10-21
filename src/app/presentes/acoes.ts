"use server";

import { redirect } from "next/navigation";
import { validarComprador, type ErrosComprador } from "@/lib/presentes";
import { mensagemDoErro } from "@/lib/servidor/banco";
import { consumirLimite } from "@/lib/servidor/limites";
import { mercadoPagoConfigurado, pagarComPix } from "@/lib/servidor/pedidos";
import { ipDoCliente } from "@/lib/servidor/requisicao";

export type EstadoCompra = { erro?: string; erros?: ErrosComprador };

/**
 * Gera o Pix de um presente. O valor vem do presente no banco
 * (pagarComPix); do navegador, só o id do presente e os dados do comprador.
 */
export async function presentear(presenteId: string, _anterior: EstadoCompra, form: FormData): Promise<EstadoCompra> {
  if (String(form.get("website") || "").trim()) return { erro: "Não foi possível gerar o Pix." };

  const comprador = validarComprador(form);
  if (!comprador.ok) return { erros: comprador.erros };

  if (!mercadoPagoConfigurado()) {
    return { erro: "O pagamento está indisponível no momento. Tente novamente mais tarde." };
  }

  let resultado: Awaited<ReturnType<typeof pagarComPix>>;
  try {
    // Contra abuso: no máximo 10 Pix por hora do mesmo endereço.
    if (!(await consumirLimite(`pix:ip:${await ipDoCliente()}`, 10, 60))) {
      return { erro: "Muitos Pix gerados em pouco tempo. Tente novamente mais tarde." };
    }
    resultado = await pagarComPix(presenteId, comprador.dados);
  } catch (erro) {
    console.error("Checkout: falha ao gerar o Pix.", mensagemDoErro(erro));
    return { erro: "Não foi possível gerar o Pix agora. Tente novamente em instantes." };
  }

  if (resultado === "indisponivel") return { erro: "Este presente não está mais disponível." };
  if (resultado === "esgotado") return { erro: "Este presente acabou de ser escolhido por outra pessoa." };
  redirect(`/presentes/pedido/${resultado.pedidoId}`);
}
