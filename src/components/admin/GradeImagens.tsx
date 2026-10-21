import Image from "next/image";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { apagarImagemAcao, moverImagemAcao } from "@/app/admin/acoes";
import BotaoConfirmar from "./BotaoConfirmar";
import { botaoIcone } from "./estilos";

type Imagem = { id: string; largura: number; altura: number };

/** Fotos já enviadas, na ordem de exibição, com mover e remover. */
export default function GradeImagens({ imagens, vazio }: { imagens: Imagem[]; vazio: string }) {
  if (imagens.length === 0) {
    return <p className="font-sans-body text-sm text-muted-foreground">{vazio}</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {imagens.map((img, i) => (
        <li key={img.id} className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="relative aspect-[4/3] bg-muted">
            <Image
              src={`/api/imagens/${img.id}`}
              alt={`Foto ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
              unoptimized
            />
            {i === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-marian-deep/90 px-2 py-0.5 font-sans-body text-[11px] font-bold text-white">
                Principal
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 p-2">
            <form action={moverImagemAcao}>
              <input type="hidden" name="id" value={img.id} />
              <input type="hidden" name="direcao" value="subir" />
              <button type="submit" className={botaoIcone} disabled={i === 0} aria-label={`Mover foto ${i + 1} para antes`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            <form action={moverImagemAcao}>
              <input type="hidden" name="id" value={img.id} />
              <input type="hidden" name="direcao" value="descer" />
              <button
                type="submit"
                className={botaoIcone}
                disabled={i === imagens.length - 1}
                aria-label={`Mover foto ${i + 1} para depois`}
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            <div className="ml-auto">
              <BotaoConfirmar
                acao={apagarImagemAcao}
                campos={{ id: img.id }}
                rotulo={
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Remover foto {i + 1}</span>
                  </>
                }
                confirmar="Remover"
                className={`${botaoIcone} w-auto px-2 text-destructive`}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
