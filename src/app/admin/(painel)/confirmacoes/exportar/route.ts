import { gerarCsv } from "@/lib/csv";
import { formatarDataHora, formatarTelefone } from "@/lib/formatos";
import { sessaoAtual } from "@/lib/servidor/admin";
import { listarConvidados } from "@/lib/servidor/confirmacoes";

/** Planilha das confirmações (resposta mais recente de cada convidado). Só para administrador. */
export async function GET() {
  if (!(await sessaoAtual())) return new Response("Não autorizado", { status: 401 });

  const convidados = await listarConvidados();
  const csv = gerarCsv(
    ["Nome", "Celular", "Resposta", "Respondido em", "Respostas enviadas"],
    convidados.map((c) => [
      c.nome,
      formatarTelefone(c.telefone),
      c.resposta === "sim" ? "Vai" : "Não vai",
      formatarDataHora(c.respondidoEm),
      c.historico.length,
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="confirmacoes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
