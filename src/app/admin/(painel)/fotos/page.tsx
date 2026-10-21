import type { Metadata } from "next";
import EnvioImagens from "@/components/admin/EnvioImagens";
import { cartao, tituloPagina } from "@/components/admin/estilos";
import GradeImagens from "@/components/admin/GradeImagens";
import { exigirAdmin } from "@/lib/servidor/admin";
import { listarImagens } from "@/lib/servidor/imagens";

export const metadata: Metadata = { title: "Fotos" };

export default async function PaginaFotos() {
  await exigirAdmin();
  const fotos = await listarImagens("carrossel");

  return (
    <div className="space-y-6">
      <div>
        <h1 className={tituloPagina}>Fotos da página inicial</h1>
        <p className="mt-1 font-sans-body text-sm text-muted-foreground">
          As fotos se alternam ao fundo da página inicial, nesta ordem. Prefira fotos na horizontal, com o casal no
          centro.
        </p>
      </div>
      <section className={`${cartao} space-y-4`}>
        <GradeImagens
          imagens={fotos}
          vazio="Nenhuma foto enviada: o site mostra as três fotos originais. Ao enviar a primeira, só as fotos enviadas aparecem."
        />
        <EnvioImagens grupo="carrossel" maxLado={2000} />
      </section>
    </div>
  );
}
