import type { Metadata } from "next";
import Link from "next/link";
import FotoPresente from "@/components/presentes/FotoPresente";
import { formatarReais } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";
import { lerConfiguracoes } from "@/lib/servidor/configuracoes";
import { listarVitrine } from "@/lib/servidor/presentes";

export const metadata: Metadata = {
  title: "Lista de presentes",
};

export default async function PaginaPresentes() {
  const [config, itens] = await Promise.all([lerConfiguracoes(), listarVitrine()]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-serif-display text-4xl font-light text-marian-deep md:text-5xl">Lista de presentes</h1>
        <div className="gold-divider mx-auto my-5 w-32" />
        {config.presentes_introducao && (
          <p className="whitespace-pre-line font-sans-body leading-relaxed text-muted-foreground">
            {config.presentes_introducao}
          </p>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="mt-16 text-center font-serif-display text-2xl italic text-gold">Em breve...</p>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
          {itens.map((item, i) => (
            <li key={item.id}>
              <Link
                href={`/presentes/${item.id}`}
                className="group flex h-full flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marian-deep focus-visible:ring-offset-4"
              >
                <div className="relative">
                  <FotoPresente
                    id={item.capa?.id ?? null}
                    alt={item.nome}
                    sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
                    ajuste="conter"
                    className={cn(
                      "aspect-square rounded-xl border border-gold/15 bg-white transition duration-300 group-hover:border-gold/50 group-hover:shadow-[0_12px_30px_hsla(var(--marian-deep),0.08)]",
                      item.esgotado && "opacity-60",
                    )}
                    priority={i < 4}
                  />
                  {item.esgotado && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 font-sans-body text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm sm:text-[11px]">
                      Já presenteado
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-0.5 pt-3">
                  <h2 className="line-clamp-2 font-serif-display text-lg font-medium leading-snug text-marian-deep sm:text-xl">
                    {item.nome}
                  </h2>
                  {item.descricao && (
                    <p className="mt-1 line-clamp-2 hidden font-sans-body text-sm leading-relaxed text-muted-foreground sm:block">
                      {item.descricao}
                    </p>
                  )}
                  <p className="mt-2 font-sans-body text-base font-bold text-marian-deep">
                    {formatarReais(item.precoCentavos)}
                  </p>
                  <div className="mt-auto pt-3">
                    <span
                      className={cn(
                        "block rounded-lg border px-3 py-2 text-center font-sans-body text-[11px] font-bold uppercase tracking-[0.12em] transition",
                        item.esgotado
                          ? "border-border text-muted-foreground"
                          : "border-gold/50 text-marian-deep group-hover:border-gold group-hover:bg-cream",
                      )}
                    >
                      {item.esgotado ? "Ver presente" : "Presentear"}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
