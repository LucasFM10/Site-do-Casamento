import Link from "next/link";
import { cartao, tituloPagina } from "@/components/admin/estilos";
import Indicador from "@/components/admin/Indicador";
import { indicadoresDePresenca } from "@/lib/confirmacoes";
import { formatarReais } from "@/lib/dinheiro";
import { formatarDataHora } from "@/lib/formatos";
import { exigirAdmin } from "@/lib/servidor/admin";
import { listarConvidados } from "@/lib/servidor/confirmacoes";
import { listarPedidosAdmin, mercadoPagoConfigurado, resumoPedidos } from "@/lib/servidor/pedidos";
import { listarPresentesAdmin } from "@/lib/servidor/presentes";

export default async function Resumo() {
  await exigirAdmin();
  const [convidados, pedidos, presentes, mensagens] = await Promise.all([
    listarConvidados(),
    resumoPedidos(),
    listarPresentesAdmin(),
    listarPedidosAdmin({ status: "aprovado", comMensagem: true }),
  ]);
  const presenca = indicadoresDePresenca(convidados);

  return (
    <div className="space-y-10">
      <h1 className={tituloPagina}>Resumo</h1>

      {!mercadoPagoConfigurado() && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 font-sans-body text-sm text-marian-deep" role="status">
          O Mercado Pago ainda não está configurado: os convidados veem a lista, mas não conseguem gerar o Pix.
        </p>
      )}

      <section aria-labelledby="presenca">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="presenca" className="font-serif-display text-2xl text-marian-deep">
            Presença
          </h2>
          <Link href="/admin/confirmacoes" className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
            Ver confirmações →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Indicador rotulo="Confirmados" valor={presenca.confirmados} />
          <Indicador rotulo="Não poderão ir" valor={presenca.recusados} />
          <Indicador rotulo="Responderam" valor={presenca.convidados} detalhe={`${presenca.respostas} respostas no total`} />
        </div>
      </section>

      <section aria-labelledby="presentes">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="presentes" className="font-serif-display text-2xl text-marian-deep">
            Presentes
          </h2>
          <Link href="/admin/pedidos" className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
            Ver pedidos →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Indicador rotulo="Arrecadado" valor={formatarReais(pedidos.aprovados.valor)} />
          <Indicador rotulo="Presentes pagos" valor={pedidos.aprovados.total} detalhe={`${pedidos.pendentes.total} aguardando pagamento`} />
          <Indicador
            rotulo="Na lista"
            valor={presentes.filter((p) => p.ativo).length}
            detalhe={`${presentes.length} cadastrados`}
          />
        </div>
      </section>

      <section aria-labelledby="mensagens">
        <h2 id="mensagens" className="mb-3 font-serif-display text-2xl text-marian-deep">
          Últimas mensagens
        </h2>
        {mensagens.length === 0 ? (
          <p className="font-sans-body text-sm text-muted-foreground">Nenhuma mensagem recebida ainda.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {mensagens.slice(0, 6).map((m) => (
              <li key={m.id} className={cartao}>
                <blockquote className="whitespace-pre-line font-serif-display text-lg italic text-marian-deep">
                  &ldquo;{m.mensagem}&rdquo;
                </blockquote>
                <p className="mt-3 font-sans-body text-xs text-muted-foreground">
                  {m.compradorNome} · {m.presente} · {formatarDataHora(m.criadoEm)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
