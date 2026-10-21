import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { banco, mensagemDoErro } from "@/lib/servidor/banco";

/**
 * Health check do container: o site responde e alcança o banco. Não devolve
 * nenhum dado nem detalhe de erro.
 */
export async function GET() {
  // Fora do try: no build, a rota não pode ser pré-renderizada.
  await connection();
  try {
    const db = await banco();
    await db.execute(sql`select 1`);
    return new Response("ok", { headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    console.error("Health check: banco indisponível.", mensagemDoErro(erro));
    return new Response("indisponível", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
