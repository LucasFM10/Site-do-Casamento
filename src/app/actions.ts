"use server";

import { normalizeBrazilianPhone } from "@/lib/phone";
import { createPocketBase } from "@/utils/pocketbase/server";

export type AttendanceResponse = "sim" | "nao";

export type AttendanceResult =
  | { success: true; response: AttendanceResponse }
  | { success: false; error: string };

function normalizeFullName(value: FormDataEntryValue | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export async function registerAttendance(formData: FormData): Promise<AttendanceResult> {
  const fullName = normalizeFullName(formData.get("nomeCompleto"));
  const phone = normalizeBrazilianPhone(String(formData.get("celular") || ""));
  const response = String(formData.get("resposta") || "") as AttendanceResponse;
  const website = String(formData.get("website") || "").trim();

  if (website) {
    return { success: false, error: "Não foi possível enviar a confirmação." };
  }

  if (fullName.length < 3 || fullName.length > 120 || fullName.split(" ").length < 2) {
    return { success: false, error: "Informe seu nome completo." };
  }

  if (!/^\d{10,11}$/.test(phone)) {
    return { success: false, error: "Informe um celular brasileiro válido com DDD." };
  }

  if (response !== "sim" && response !== "nao") {
    return { success: false, error: "Selecione se poderá comparecer." };
  }

  try {
    const pb = createPocketBase();
    await pb.collection("confirmacoes").create({
      nome_completo: fullName,
      celular: phone,
      resposta: response,
    });

    return { success: true, response };
  } catch (error) {
    console.error("Erro ao registrar confirmação no PocketBase:", error);
    return {
      success: false,
      error: "Não foi possível registrar sua confirmação. Tente novamente em instantes.",
    };
  }
}
