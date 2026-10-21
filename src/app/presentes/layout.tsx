import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { lerConfiguracoes } from "@/lib/servidor/configuracoes";

export default async function LayoutPresentes({ children }: { children: React.ReactNode }) {
  const config = await lerConfiguracoes();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <header className="border-b border-gold/20 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-sans-body text-sm font-bold text-marian-deep transition hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Início
          </Link>
          <Link href="/" className="font-serif-display text-2xl font-light text-marian-deep">
            {config.nome_1} <span className="text-gold">&</span> {config.nome_2}
          </Link>
          {/* Equilibra o título no centro. */}
          <span className="w-14" aria-hidden="true" />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="px-6 py-8 text-center font-sans-body text-xs text-muted-foreground">
        Pagamentos processados com segurança pelo Mercado Pago.
      </footer>
    </div>
  );
}
