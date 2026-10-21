import type { Metadata } from "next";
import Link from "next/link";
import { Download, MessageCircle } from "lucide-react";
import { botaoPrimario, botaoSecundario, campo, cartao, selo, tituloPagina } from "@/components/admin/estilos";
import Indicador from "@/components/admin/Indicador";
import { filtrarConvidados, indicadoresDePresenca, type Resposta } from "@/lib/confirmacoes";
import { formatarDataHora, formatarTelefone, linkWhatsapp } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { exigirAdmin } from "@/lib/servidor/admin";
import { listarConvidados } from "@/lib/servidor/confirmacoes";

export const metadata: Metadata = { title: "Confirmações" };

type Props = { searchParams: Promise<{ busca?: string; resposta?: string }> };

const OPCOES = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "sim", rotulo: "Confirmados" },
  { valor: "nao", rotulo: "Não vão" },
] as const;

function SeloResposta({ resposta }: { resposta: Resposta }) {
  return (
    <span className={cn(selo, resposta === "sim" ? "bg-marian-deep text-white" : "bg-muted text-muted-foreground")}>
      {resposta === "sim" ? "Vai" : "Não vai"}
    </span>
  );
}

export default async function PaginaConfirmacoes({ searchParams }: Props) {
  await exigirAdmin();
  const params = await searchParams;
  const busca = (params.busca ?? "").slice(0, 100);
  const resposta = params.resposta === "sim" || params.resposta === "nao" ? params.resposta : "todos";

  const convidados = await listarConvidados();
  const indicadores = indicadoresDePresenca(convidados);
  const lista = filtrarConvidados(convidados, { busca, resposta });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className={tituloPagina}>Confirmações</h1>
        <a href="/admin/confirmacoes/exportar" className={botaoSecundario}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Baixar planilha (CSV)
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador rotulo="Confirmados" valor={indicadores.confirmados} />
        <Indicador rotulo="Não vão" valor={indicadores.recusados} />
        <Indicador rotulo="Convidados" valor={indicadores.convidados} detalhe="Pessoas diferentes que responderam" />
        <Indicador
          rotulo="Repetidas"
          valor={indicadores.repetidos}
          detalhe="Responderam mais de uma vez (vale a última)"
        />
      </div>

      <form className={`${cartao} flex flex-col gap-3 sm:flex-row sm:items-end`} role="search">
        <div className="flex-1 space-y-1">
          <label htmlFor="busca" className="font-sans-body text-sm font-bold text-marian-deep">
            Buscar por nome ou celular
          </label>
          <input id="busca" name="busca" defaultValue={busca} className={campo} placeholder="Ex.: Maria ou 99999" />
        </div>
        <div className="space-y-1">
          <label htmlFor="resposta" className="font-sans-body text-sm font-bold text-marian-deep">
            Resposta
          </label>
          <select id="resposta" name="resposta" defaultValue={resposta} className={campo}>
            {OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={botaoPrimario}>
          Filtrar
        </button>
        {(busca || resposta !== "todos") && (
          <Link href="/admin/confirmacoes" className="py-2 text-center font-sans-body text-sm font-bold text-muted-foreground">
            Limpar
          </Link>
        )}
      </form>

      <p className="font-sans-body text-sm text-muted-foreground" role="status">
        {lista.length === convidados.length
          ? `${lista.length} convidados`
          : `${lista.length} de ${convidados.length} convidados`}
      </p>

      {lista.length === 0 ? (
        <p className="font-sans-body text-muted-foreground">Nenhuma confirmação encontrada.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => (
            <li key={c.chave} className={cartao}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-sans-body text-base font-bold text-marian-deep">{c.nome}</p>
                  <a
                    href={linkWhatsapp(c.telefone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 font-sans-body text-sm text-muted-foreground hover:text-marian-deep"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {formatarTelefone(c.telefone)}
                  </a>
                </div>
                <div className="text-right">
                  <SeloResposta resposta={c.resposta} />
                  <p className="mt-1 font-sans-body text-xs text-muted-foreground">{formatarDataHora(c.respondidoEm)}</p>
                </div>
              </div>
              {c.historico.length > 1 && (
                <details className="mt-3 border-t border-border pt-3">
                  <summary className="cursor-pointer font-sans-body text-xs font-bold text-gold">
                    Respondeu {c.historico.length} vezes{c.mudouDeIdeia ? " · mudou a resposta" : ""}
                  </summary>
                  <ol className="mt-2 space-y-1 font-sans-body text-xs text-muted-foreground">
                    {c.historico.map((h) => (
                      <li key={h.id} className="flex items-center gap-2">
                        <SeloResposta resposta={h.resposta} />
                        {formatarDataHora(h.criadoEm)}
                        {h.nomeCompleto !== c.nome && <span>({h.nomeCompleto})</span>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
