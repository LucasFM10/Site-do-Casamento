import type { Metadata } from "next";
import Link from "next/link";
import { cartao, tituloPagina } from "@/components/admin/estilos";
import FormularioPresente from "@/components/admin/FormularioPresente";
import { exigirAdmin } from "@/lib/servidor/admin";

export const metadata: Metadata = { title: "Novo presente" };

export default async function NovoPresente() {
  await exigirAdmin();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/presentes" className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
        ← Presentes
      </Link>
      <h1 className={tituloPagina}>Novo presente</h1>
      <div className={cartao}>
        <FormularioPresente />
      </div>
      <p className="font-sans-body text-sm text-muted-foreground">Depois de criar, você poderá adicionar as fotos.</p>
    </div>
  );
}
