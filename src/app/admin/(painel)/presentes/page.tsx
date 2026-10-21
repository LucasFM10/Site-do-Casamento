import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from "lucide-react";
import { definirAtivoAcao, moverPresenteAcao } from "@/app/admin/acoes";
import { botaoIcone, botaoPrimario, botaoSecundario, cartao, selo, tituloPagina } from "@/components/admin/estilos";
import FotoPresente from "@/components/presentes/FotoPresente";
import { formatarReais } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";
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
            A ordem aqui é a ordem da lista no site. Presentes ocultos não aparecem para os convidados.
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
        <ul className="space-y-3">
          {presentes.map((p, i) => (
            <li key={p.id} className={cn(cartao, "flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap")}>
              <FotoPresente id={p.capa?.id ?? null} alt="" sizes="96px" className="h-16 w-20 shrink-0 rounded-lg" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/presentes/${p.id}`}
                    className="font-sans-body text-base font-bold text-marian-deep hover:text-gold"
                  >
                    {p.nome}
                  </Link>
                  {!p.ativo && <span className={cn(selo, "bg-muted text-muted-foreground")}>Oculto</span>}
                  {p.esgotado && <span className={cn(selo, "bg-gold/15 text-gold")}>Esgotado</span>}
                </div>
                <p className="mt-1 font-sans-body text-sm text-muted-foreground">
                  {formatarReais(p.precoCentavos)} · {p.aprovados}
                  {p.quantidadeMaxima !== null ? ` de ${p.quantidadeMaxima}` : ""} {p.aprovados === 1 ? "pago" : "pagos"}
                  {p.arrecadadoCentavos > 0 && ` · ${formatarReais(p.arrecadadoCentavos)} arrecadados`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <form action={moverPresenteAcao}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="direcao" value="subir" />
                  <button type="submit" className={botaoIcone} disabled={i === 0} aria-label={`Subir ${p.nome}`}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
                <form action={moverPresenteAcao}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="direcao" value="descer" />
                  <button
                    type="submit"
                    className={botaoIcone}
                    disabled={i === presentes.length - 1}
                    aria-label={`Descer ${p.nome}`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
                <form action={definirAtivoAcao}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="ativo" value={p.ativo ? "0" : "1"} />
                  <button
                    type="submit"
                    className={botaoIcone}
                    aria-label={p.ativo ? `Ocultar ${p.nome}` : `Mostrar ${p.nome}`}
                    title={p.ativo ? "Ocultar do site" : "Mostrar no site"}
                  >
                    {p.ativo ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </form>
                <Link href={`/admin/presentes/${p.id}`} className={botaoSecundario}>
                  Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
