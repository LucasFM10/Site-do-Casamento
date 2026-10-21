import Link from "next/link";
import { LogOut } from "lucide-react";
import { sairDoPainel } from "@/app/admin/acoes";
import NavAdmin from "@/components/admin/NavAdmin";
import { exigirAdmin } from "@/lib/servidor/admin";

/**
 * Área autenticada do painel. A sessão é conferida aqui e, de novo, em cada
 * página e em cada ação (o layout não protege ações nem rotas).
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();

  return (
    <>
      <header className="border-b border-gold/20 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="font-serif-display text-2xl font-light text-marian-deep">
              Painel dos noivos
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden font-sans-body text-sm text-muted-foreground sm:inline">Olá, {admin.nome}</span>
              <Link href="/" target="_blank" className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
                Ver site
              </Link>
              <form action={sairDoPainel}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 font-sans-body text-sm font-bold text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sair
                </button>
              </form>
            </div>
          </div>
          <NavAdmin />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </>
  );
}
