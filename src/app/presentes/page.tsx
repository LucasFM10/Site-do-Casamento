import type { Metadata } from "next";
import Link from "next/link";
import FotoPresente from "@/components/presentes/FotoPresente";
import { formatarReais } from "@/lib/dinheiro";
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
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((item, i) => (
            <li key={item.id}>
              <Link
                href={`/presentes/${item.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-gold/20 bg-white shadow-[0_10px_30px_hsla(var(--marian-deep),0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marian-deep focus-visible:ring-offset-2"
              >
                <FotoPresente
                  id={item.capa?.id ?? null}
                  alt={item.nome}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/3]"
                  priority={i < 3}
                />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-serif-display text-2xl font-medium leading-tight text-marian-deep">{item.nome}</h2>
                  {item.descricao && (
                    <p className="mt-2 line-clamp-2 font-sans-body text-sm leading-relaxed text-muted-foreground">
                      {item.descricao}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="font-sans-body text-lg font-bold text-marian-deep">
                      {formatarReais(item.precoCentavos)}
                    </span>
                    {item.esgotado ? (
                      <span className="rounded-full bg-muted px-3 py-1 font-sans-body text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Já presenteado
                      </span>
                    ) : (
                      <span className="rounded-lg border border-gold/50 px-4 py-2 font-sans-body text-xs font-bold uppercase tracking-[0.12em] text-marian-deep transition group-hover:bg-cream">
                        Presentear
                      </span>
                    )}
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
