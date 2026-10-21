import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cartao } from "@/components/admin/estilos";
import { sessaoAtual } from "@/lib/servidor/admin";
import FormularioLogin from "./FormularioLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  if (await sessaoAtual()) redirect("/admin");

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className={`${cartao} w-full max-w-sm p-8`}>
        <h1 className="text-center font-serif-display text-3xl font-light text-marian-deep">Painel dos noivos</h1>
        <div className="gold-divider mx-auto my-5 w-24" />
        <FormularioLogin />
      </div>
    </main>
  );
}
