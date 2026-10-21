"use server";

import { after } from "next/server";
import { confirmacoes } from "@/db/esquema";
import { isValidBrazilianPhone, toStoredBrazilianPhone } from "@/lib/phone";
import { banco, mensagemDoErro } from "@/lib/servidor/banco";
import { consumirLimite } from "@/lib/servidor/limites";
import { ipDoCliente } from "@/lib/servidor/requisicao";
import { avisarPorWhatsapp } from "@/lib/servidor/whatsapp";

export type AttendanceResponse = "sim" | "nao";

export type AttendanceResult =
  | { success: true; response: AttendanceResponse }
  | { success: false; error: string };

function normalizeFullName(value: FormDataEntryValue | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export async function registerAttendance(formData: FormData): Promise<AttendanceResult> {
  const fullName = normalizeFullName(formData.get("nomeCompleto"));
  const rawPhone = String(formData.get("celular") || "");
  const response = String(formData.get("resposta") || "") as AttendanceResponse;
  const website = String(formData.get("website") || "").trim();

  if (website) {
    return { success: false, error: "Não foi possível enviar a confirmação." };
  }

  if (fullName.length < 3 || fullName.length > 120 || fullName.split(" ").length < 2) {
    return { success: false, error: "Informe seu nome completo." };
  }

  if (!isValidBrazilianPhone(rawPhone)) {
    return { success: false, error: "Informe um celular brasileiro válido com DDD." };
  }

  if (response !== "sim" && response !== "nao") {
    return { success: false, error: "Selecione se poderá comparecer." };
  }

  const telefone = toStoredBrazilianPhone(rawPhone);

  try {
    // Contra robôs: no máximo 30 confirmações por hora do mesmo endereço.
    if (!(await consumirLimite(`rsvp:ip:${await ipDoCliente()}`, 30, 60))) {
      return { success: false, error: "Muitas confirmações enviadas em pouco tempo. Tente novamente mais tarde." };
    }
    const db = await banco();
    await db.insert(confirmacoes).values({ nomeCompleto: fullName, telefone, resposta: response });
  } catch (error) {
    console.error("Erro ao registrar confirmação:", mensagemDoErro(error));
    return {
      success: false,
      error: "Não foi possível registrar sua confirmação. Tente novamente em instantes.",
    };
  }

  // Depois da resposta ao convidado: o WhatsApp não atrasa nem desfaz a confirmação.
  after(() =>
    avisarPorWhatsapp(
      response === "sim" ? "WHATSAPP_MSG_CONFIRMACAO_SIM" : "WHATSAPP_MSG_CONFIRMACAO_NAO",
      telefone,
      { nome: fullName.split(" ")[0] },
    ),
  );

  return { success: true, response };
}
