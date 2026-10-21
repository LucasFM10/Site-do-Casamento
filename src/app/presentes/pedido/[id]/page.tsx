import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, Heart } from "lucide-react";
import AcompanharPix from "@/components/presentes/AcompanharPix";
import { preencherTexto } from "@/lib/configuracoes";
import { formatarReais } from "@/lib/dinheiro";
import { lerConfiguracoes } from "@/lib/servidor/configuracoes";
import { dadosPix, mercadoPagoConfigurado, obterPedido, statusParaAcompanhar } from "@/lib/servidor/pedidos";

export const metadata: Metadata = {
  title: "Seu presente",
  robots: { index: false, follow: false },
};

const cartao = "rounded-xl border border-gold/20 bg-white p-6 shadow-[0_10px_30px_hsla(var(--marian-deep),0.06)] sm:p-8";

function horario(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

async function lerPix(pedido: { meio: string; mpPaymentId: string | null }) {
  try {
    return await dadosPix(pedido);
  } catch (erro) {
    console.error("Pedido: falha ao ler o Pix no Mercado Pago.", erro instanceof Error ? erro.message : "");
    return null;
  }
}

/** Acompanhamento do pedido: QR do Pix enquanto pendente, agradecimento quando aprovado. */
export default async function PaginaPedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Pendente: confere no Mercado Pago antes de mostrar (o webhook pode atrasar).
  await statusParaAcompanhar(id);
  const pedido = await obterPedido(id);
  if (!pedido) notFound();

  const primeiroNome = pedido.compradorNome.split(" ")[0];
  const resumo = (
    <p className="font-sans-body text-sm text-muted-foreground">
      {pedido.presente} · <strong className="text-marian-deep">{formatarReais(pedido.valorCentavos)}</strong>
    </p>
  );

  if (pedido.status === "aprovado") {
    const config = await lerConfiguracoes();
    return (
      <main className="mx-auto max-w-lg px-5 py-12 text-center">
        <div className={cartao}>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
            <Heart className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="font-serif-display text-4xl font-light text-marian-deep">Presente recebido!</h1>
          <div className="gold-divider mx-auto my-5 w-24" />
          <p className="whitespace-pre-line font-sans-body leading-relaxed text-foreground">
            {preencherTexto(config.presentes_agradecimento, { nome: primeiroNome })}
          </p>
          <div className="mt-5">{resumo}</div>
          <p className="mt-6 font-serif-display text-xl italic text-gold">
            {config.nome_1} & {config.nome_2}
          </p>
        </div>
        <Link href="/" className="mt-8 inline-block font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
          Voltar ao início
        </Link>
      </main>
    );
  }

  if (pedido.status !== "pendente") {
    const titulo = pedido.status === "reembolsado" ? "Pagamento estornado" : "Pagamento não concluído";
    return (
      <main className="mx-auto max-w-lg px-5 py-12 text-center">
        <div className={cartao}>
          <CircleAlert className="mx-auto mb-4 h-10 w-10 text-gold" aria-hidden="true" />
          <h1 className="font-serif-display text-3xl font-light text-marian-deep">{titulo}</h1>
          <div className="mt-4">{resumo}</div>
          <p className="mt-4 font-sans-body text-sm leading-relaxed text-muted-foreground">
            {pedido.status === "reembolsado"
              ? "O valor deste presente foi devolvido."
              : "O Pix venceu ou o pagamento não foi aprovado. Nenhum valor foi cobrado."}
          </p>
          {pedido.status !== "reembolsado" && (
            <Link href={`/presentes/${pedido.presenteId}`} className="btn-submit mt-6 inline-block font-sans-body">
              Tentar de novo
            </Link>
          )}
        </div>
      </main>
    );
  }

  const pix = mercadoPagoConfigurado() ? await lerPix(pedido) : null;

  return (
    <main className="mx-auto max-w-lg px-5 py-10 text-center">
      <h1 className="font-serif-display text-4xl font-light text-marian-deep">Quase lá, {primeiroNome}!</h1>
      <p className="mx-auto mt-3 max-w-sm font-sans-body leading-relaxed text-muted-foreground">
        Pague com o QR Code ou o código Pix no app do seu banco.
      </p>
      <div className="mt-2">{resumo}</div>

      <div className={`${cartao} mt-8`}>
        {pix ? (
          <>
            {pix.qrCodeBase64 && (
              <Image
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code do Pix"
                width={240}
                height={240}
                unoptimized
                className="mx-auto mb-2 h-60 w-60 rounded-lg border border-border"
              />
            )}
            {pix.expiraEm && (
              <p className="mb-6 font-sans-body text-xs text-muted-foreground">Válido até {horario(pix.expiraEm)}</p>
            )}
            <div className="text-left">
              <AcompanharPix pedidoId={pedido.id} codigo={pix.qrCode} expiraEm={pix.expiraEm} />
            </div>
          </>
        ) : (
          <p className="font-sans-body text-sm text-muted-foreground" role="alert">
            Não foi possível carregar o Pix agora. Atualize a página em instantes.
          </p>
        )}
      </div>

      <p className="mt-6 font-sans-body text-xs text-muted-foreground">
        Guarde o endereço desta página para acompanhar o pagamento.
      </p>
    </main>
  );
}
