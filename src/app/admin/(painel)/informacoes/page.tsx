import type { Metadata } from "next";
import { tituloPagina } from "@/components/admin/estilos";
import FormularioInformacoes from "@/components/admin/FormularioInformacoes";
import { exigirAdmin } from "@/lib/servidor/admin";
import { lerConfiguracoes } from "@/lib/servidor/configuracoes";

export const metadata: Metadata = { title: "Informações" };

export default async function PaginaInformacoes() {
  await exigirAdmin();
  const valores = await lerConfiguracoes();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className={tituloPagina}>Informações do casamento</h1>
        <p className="mt-1 font-sans-body text-sm text-muted-foreground">
          Textos da página inicial, de “Informações do casamento” e da lista de presentes. Campo opcional em branco
          não aparece no site.
        </p>
      </div>
      <FormularioInformacoes valores={valores} />
    </div>
  );
}
