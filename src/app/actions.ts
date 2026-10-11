"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearPocketBaseAuth,
  createPocketBase,
  persistPocketBaseAuth,
  requireAdminPocketBase,
} from "@/utils/pocketbase/server";

export interface Offering {
  id: string;
  nome_devoto: string;
  quantidade: number;
  intencao: string;
  foto_url: string | null;
  vista: boolean;
  created_at: string;
}

export async function registerOffering(formData: FormData) {
  const nomeDevoto = String(formData.get("nomeDevoto") || "").trim();
  const quantidade = Number.parseInt(String(formData.get("quantidade") || "1"), 10);
  const intencao = String(formData.get("intencao") || "").trim();
  const file = formData.get("foto") as File | null;

  try {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 10000) {
      return { success: false, error: "Quantidade inválida." };
    }

    if (nomeDevoto.length > 120 || intencao.length > 2000) {
      return { success: false, error: "Os dados informados excedem o limite permitido." };
    }

    if (file && file.size > 5 * 1024 * 1024) {
      return { success: false, error: "A foto deve ser menor que 5MB." };
    }

    const payload = new FormData();
    payload.set("nome_devoto", nomeDevoto || "Anônimo");
    payload.set("quantidade", quantidade.toString());
    payload.set("intencao", intencao);

    if (file && file.size > 0) {
      payload.set("foto", file);
    }

    const pb = createPocketBase();
    await pb.collection("tercos").create(payload);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar no PocketBase:", error);
    return { success: false, error: "Falha ao registrar intenção no banco." };
  }
}

export async function getTotalOfferings() {
  try {
    const pb = createPocketBase();
    const result = await pb.collection("tercos_total").getFirstListItem("", {
      fields: "total",
      requestKey: null,
    });

    return Number(result.total) || 0;
  } catch (error) {
    console.error("Erro ao buscar total no PocketBase:", error);
    return 450;
  }
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const pb = createPocketBase();

  try {
    await pb.collection("admins").authWithPassword(email, password);
    persistPocketBaseAuth(pb);
  } catch {
    redirect("/login?error=Credenciais%20inv%C3%A1lidas");
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function signOut() {
  clearPocketBaseAuth();
  redirect("/login");
}

export async function getAllOfferings(): Promise<Offering[]> {
  const pb = await requireAdminPocketBase();
  const records = await pb.collection("tercos").getFullList({
    sort: "-created",
    fields: "id,nome_devoto,quantidade,intencao,foto,vista,created",
    requestKey: null,
  });

  return records.map((record) => ({
    id: record.id,
    nome_devoto: record.nome_devoto,
    quantidade: record.quantidade,
    intencao: record.intencao,
    foto_url: record.foto ? `/api/offerings/${record.id}/photo` : null,
    vista: record.vista,
    created_at: record.created,
  }));
}

export async function toggleSeenStatus(id: string, _currentStatus: boolean) {
  try {
    const pb = await requireAdminPocketBase();
    const record = await pb.collection("tercos").getOne(id, {
      fields: "id,vista",
      requestKey: null,
    });

    await pb.collection("tercos").update(id, { vista: !record.vista });
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    return { success: false };
  }

  revalidatePath("/admin");
  return { success: true };
}
