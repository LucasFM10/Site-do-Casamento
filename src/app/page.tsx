import { connection } from "next/server";
import HeroCarousel, { type FotoCarrossel } from "@/components/HeroCarousel";
import WeddingActions from "@/components/WeddingActions";
import { mensagemDoErro } from "@/lib/servidor/banco";
import { lerConfiguracoes } from "@/lib/servidor/configuracoes";
import { listarImagens, urlDaImagem } from "@/lib/servidor/imagens";

/** Fotos originais, usadas enquanto nenhuma for enviada pelo painel. */
const FOTOS_PADRAO: FotoCarrossel[] = [1, 2, 3].map((n) => ({ src: `/assets/couple-${n}.jpg`, doBanco: false }));

async function fotosDoCarrossel(): Promise<FotoCarrossel[]> {
  try {
    const fotos = await listarImagens("carrossel");
    return fotos.length ? fotos.map((f) => ({ src: urlDaImagem(f.id), doBanco: true })) : FOTOS_PADRAO;
  } catch (erro) {
    console.error("Carrossel: banco indisponível, usando as fotos originais.", mensagemDoErro(erro));
    return FOTOS_PADRAO;
  }
}

export default async function Home() {
  // Fora dos try: a página é sempre da requisição, nunca pré-renderizada no build.
  await connection();
  const [config, fotos] = await Promise.all([lerConfiguracoes(), fotosDoCarrossel()]);
  return (
    <HeroCarousel fotos={fotos} config={config}>
      <WeddingActions config={config} />
    </HeroCarousel>
  );
}
