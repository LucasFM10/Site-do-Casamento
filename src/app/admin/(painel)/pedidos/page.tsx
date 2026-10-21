import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, RefreshCw } from "lucide-react";
import { verificarPagamentoAcao } from "@/app/admin/acoes";
import { botaoSecundario, cartao, tituloPagina } from "@/components/admin/estilos";
import Indicador from "@/components/admin/Indicador";
import SeloStatus from "@/components/admin/SeloStatus";
import { formatarReais } from "@/lib/dinheiro";
import { formatarDataHora, formatarTelefone, linkWhatsapp } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { exigirAdmin } from "@/lib/servidor/admin";
import { listarPedidosAdmin, mercadoPagoConfigurado, resumoPedidos, type StatusPedido } from "@/lib/servidor/pedidos";

export const metadata: Metadata = { title: "Pedidos e mensagens" };

const FILTROS: { valor: StatusPedido | "todos" | "mensagens"; rotulo: string }[] = [
  { valor: "aprovado", rotulo: "Pagos" },
  { valor: "mensagens", rotulo: "Com mensagem" },
  { valor: "pendente", rotulo: "Aguardando" },
  { valor: "todos", rotulo: "Todos" },
];

type Props = { searchParams: Promise<{ filtro?: string }> };

export default async function PaginaPedidos({ searchParams }: Props) {
  await exigirAdmin();
  const { filtro: bruto } = await searchParams;
  const filtro = FILTROS.find((f) => f.valor === bruto)?.valor ?? "aprovado";

  const [resumo, pedidos] = await Promise.all([
    resumoPedidos(),
    listarPedidosAdmin(
      filtro === "mensagens"
        ? { comMensagem: true }
        : filtro === "todos"
          ? {}
          : { status: filtro },
    ),
  ]);
  const podeVerificar = mercadoPagoConfigurado();

  return (
    <div className="space-y-8">
      <h1 className={tituloPagina}>Pedidos e mensagens</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="Arrecadado" valor={formatarReais(resumo.aprovados.valor)} />
        <Indicador rotulo="Pagos" valor={resumo.aprovados.total} />
        <Indicador rotulo="Aguardando" valor={resumo.pendentes.total} detalhe="Pix gerados e ainda não pagos" />
      </div>

      <nav aria-label="Filtrar pedidos" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/admin/pedidos?filtro=${f.valor}`}
            aria-current={filtro === f.valor ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 font-sans-body text-sm font-bold transition",
              filtro === f.valor
                ? "border-marian-deep bg-marian-deep text-white"
                : "border-gold/40 bg-white text-marian-deep hover:bg-cream",
            )}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      {pedidos.length === 0 ? (
        <p className="font-sans-body text-muted-foreground">Nenhum pedido aqui.</p>
      ) : (
        <ul className="space-y-3">
          {pedidos.map((p) => (
            <li key={p.id} className={cartao}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-sans-body text-base font-bold text-marian-deep">{p.presente}</p>
                  <p className="font-sans-body text-sm text-muted-foreground">
                    {formatarReais(p.valorCentavos)} · {p.meio === "pix" ? "Pix" : "Cartão"} · {formatarDataHora(p.criadoEm)}
                  </p>
                </div>
                <SeloStatus status={p.status} />
              </div>

              <div className="mt-3 font-sans-body text-sm text-foreground">
                <p>
                  <strong>{p.compradorNome}</strong> · {p.compradorEmail}
                </p>
                {p.compradorTelefone && (
                  <a
                    href={linkWhatsapp(p.compradorTelefone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-muted-foreground hover:text-marian-deep"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {formatarTelefone(p.compradorTelefone)}
                  </a>
                )}
              </div>

              {p.mensagem && (
                <blockquote className="mt-3 whitespace-pre-line border-l-2 border-gold/50 pl-4 font-serif-display text-lg italic text-marian-deep">
                  {p.mensagem}
                </blockquote>
              )}

              {p.status === "pendente" && p.mpPaymentId && podeVerificar && (
                <form action={verificarPagamentoAcao} className="mt-4">
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={botaoSecundario}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Verificar no Mercado Pago
                  </button>
                </form>
              )}
              {p.mpPaymentId && (
                <p className="mt-3 font-sans-body text-xs text-muted-foreground">Pagamento no Mercado Pago: {p.mpPaymentId}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
