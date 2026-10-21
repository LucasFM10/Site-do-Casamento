import { statusParaAcompanhar } from "@/lib/servidor/pedidos";

/**
 * Status do pedido para a página de acompanhamento do Pix (consulta a cada
 * poucos segundos). Devolve só o status: o id do pedido é a única chave.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const status = await statusParaAcompanhar((await params).id);
  const headers = { "Cache-Control": "no-store" };
  if (!status) return Response.json({ erro: "Pedido não encontrado." }, { status: 404, headers });
  return Response.json({ status }, { headers });
}
