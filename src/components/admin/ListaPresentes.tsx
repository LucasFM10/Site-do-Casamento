"use client";

import Link from "next/link";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { definirAtivoAcao, reordenarPresentesAcao } from "@/app/admin/acoes";
import FotoPresente from "@/components/presentes/FotoPresente";
import { formatarReais } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";
import { botaoIcone, botaoSecundario, cartao, selo } from "./estilos";
import { AreaOrdenavel, AvisoOrdem, ItemOrdenavel, useOrdem } from "./Ordenavel";

export type PresenteDaLista = {
  id: string;
  nome: string;
  precoCentavos: number;
  ativo: boolean;
  quantidadeMaxima: number | null;
  aprovados: number;
  arrecadadoCentavos: number;
  esgotado: boolean;
  capa: { id: string } | null;
};

/** Presentes do painel, na ordem do site; arraste pela alça para mudar a ordem. */
export default function ListaPresentes({ presentes }: { presentes: PresenteDaLista[] }) {
  const { lista, aoSoltar, erro, salvando } = useOrdem(presentes, reordenarPresentesAcao);
  const nome = (id: string) => lista.find((p) => p.id === id)?.nome ?? "Presente";

  return (
    <div className="space-y-2">
      <AreaOrdenavel id="ordem-presentes" itens={lista} aoSoltar={aoSoltar} nome={nome}>
        <ul className="space-y-3">
          {lista.map((p) => (
            <ItemOrdenavel
              key={p.id}
              id={p.id}
              rotulo={p.nome}
              className={cn(cartao, "flex items-center gap-3 p-3 sm:gap-4 sm:p-4")}
            >
              {(alca) => (
                <>
                  {lista.length > 1 && alca}
                  <FotoPresente
                    id={p.capa?.id ?? null}
                    alt=""
                    sizes="80px"
                    ajuste="conter"
                    className="h-14 w-14 shrink-0 rounded-lg sm:h-16 sm:w-16"
                  />

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
                      {p.quantidadeMaxima !== null ? ` de ${p.quantidadeMaxima}` : ""}{" "}
                      {p.aprovados === 1 ? "pago" : "pagos"}
                      {p.arrecadadoCentavos > 0 && ` · ${formatarReais(p.arrecadadoCentavos)} arrecadados`}
                    </p>
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <form action={definirAtivoAcao}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="ativo" value={p.ativo ? "0" : "1"} />
                      <button
                        type="submit"
                        className={botaoIcone}
                        aria-label={p.ativo ? `Ocultar ${p.nome}` : `Mostrar ${p.nome}`}
                        title={p.ativo ? "Ocultar do site" : "Mostrar no site"}
                      >
                        {p.ativo ? (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </form>
                    <Link
                      href={`/admin/presentes/${p.id}`}
                      className={cn(botaoIcone, "sm:hidden")}
                      aria-label={`Editar ${p.nome}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link href={`/admin/presentes/${p.id}`} className={cn(botaoSecundario, "hidden sm:inline-flex")}>
                      Editar
                    </Link>
                  </div>
                </>
              )}
            </ItemOrdenavel>
          ))}
        </ul>
      </AreaOrdenavel>
      <AvisoOrdem erro={erro} salvando={salvando} />
    </div>
  );
}
