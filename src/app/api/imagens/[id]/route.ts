import { lerImagem } from "@/lib/servidor/imagens";

/**
 * Imagem guardada no banco (presentes e carrossel). O conteúdo de um id
 * nunca muda (trocar a foto cria outro id), então o cache é longo.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const imagem = await lerImagem((await params).id);
  if (!imagem) return new Response("Não encontrada", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(imagem.dados), {
    headers: {
      "Content-Type": imagem.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
