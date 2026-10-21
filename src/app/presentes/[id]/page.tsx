import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FormularioCompra from "@/components/presentes/FormularioCompra";
import Galeria from "@/components/presentes/Galeria";
import { formatarReais } from "@/lib/dinheiro";
import { obterPresentePublico } from "@/lib/servidor/presentes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const presente = await obterPresentePublico((await params).id);
  return { title: presente?.nome ?? "Presente" };
}

export default async function PaginaPresente({ params }: Props) {
  const presente = await obterPresentePublico((await params).id);
  if (!presente) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:py-12">
      <Link href="/presentes" className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
        ← Todos os presentes
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="md:sticky md:top-8 md:self-start">
          <Galeria ids={presente.imagens.map((i) => i.id)} nome={presente.nome} />
        </div>

        <div>
          <h1 className="font-serif-display text-4xl font-light leading-tight text-marian-deep md:text-5xl">
            {presente.nome}
          </h1>
          <p className="mt-3 font-sans-body text-2xl font-bold text-marian-deep">{formatarReais(presente.precoCentavos)}</p>
          {presente.descricao && (
            <p className="mt-5 whitespace-pre-line font-sans-body leading-relaxed text-muted-foreground">
              {presente.descricao}
            </p>
          )}

          <div className="gold-divider my-8" />

          {presente.esgotado ? (
            <div className="rounded-xl border border-gold/20 bg-white p-6 text-center">
              <p className="font-serif-display text-2xl italic text-gold">Este presente já foi escolhido.</p>
              <Link href="/presentes" className="btn-submit mt-5 inline-block font-sans-body">
                Ver outros presentes
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-gold/20 bg-white p-6 shadow-[0_10px_30px_hsla(var(--marian-deep),0.06)] sm:p-8">
              <h2 className="font-serif-display text-2xl font-medium text-marian-deep">Presentear</h2>
              <p className="mb-6 mt-1 font-sans-body text-sm text-muted-foreground">
                Sem cadastro: preencha seus dados e pague com o QR Code ou o código Pix.
              </p>
              <FormularioCompra presenteId={presente.id} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
