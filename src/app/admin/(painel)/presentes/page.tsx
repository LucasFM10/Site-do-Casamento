import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { botaoPrimario, cartao, tituloPagina } from "@/components/admin/estilos";
import ListaPresentes from "@/components/admin/ListaPresentes";
import { exigirAdmin } from "@/lib/servidor/admin";
import { listarPresentesAdmin } from "@/lib/servidor/presentes";

export const metadata: Metadata = { title: "Presentes" };

export default async function PaginaPresentesAdmin() {
  await exigirAdmin();
  const presentes = await listarPresentesAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={tituloPagina}>Presentes</h1>
          <p className="mt-1 font-sans-body text-sm text-muted-foreground">
            A ordem aqui é a ordem da lista no site: arraste pela alça para mudar. Presentes ocultos não aparecem para
            os convidados.
          </p>
        </div>
        <Link href="/admin/presentes/novo" className={botaoPrimario}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo presente
        </Link>
      </div>

      {presentes.length === 0 ? (
        <div className={`${cartao} text-center`}>
          <p className="font-sans-body text-muted-foreground">Nenhum presente cadastrado ainda.</p>
        </div>
      ) : (
        <ListaPresentes presentes={presentes} />
      )}

      <Link
        href="/admin/presentes/novo"
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/40 px-4 py-5 font-sans-body text-sm font-bold text-marian-deep transition hover:border-gold hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Adicionar presente
      </Link>
    </div>
  );
}
