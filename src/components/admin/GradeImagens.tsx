"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { apagarImagemAcao, reordenarImagensAcao } from "@/app/admin/acoes";
import BotaoConfirmar from "./BotaoConfirmar";
import { botaoIcone } from "./estilos";
import { AreaOrdenavel, AvisoOrdem, ItemOrdenavel, useOrdem } from "./Ordenavel";

type Imagem = { id: string; largura: number; altura: number };

/** Fotos já enviadas, na ordem de exibição; arraste pela alça para mudar a ordem. */
export default function GradeImagens({ imagens, vazio }: { imagens: Imagem[]; vazio: string }) {
  const { lista, aoSoltar, erro, salvando } = useOrdem(imagens, reordenarImagensAcao);

  if (lista.length === 0) {
    return <p className="font-sans-body text-sm text-muted-foreground">{vazio}</p>;
  }

  const nome = (id: string) => `Foto ${lista.findIndex((i) => i.id === id) + 1}`;

  return (
    <div className="space-y-2">
      {lista.length > 1 && (
        <p className="font-sans-body text-xs text-muted-foreground">Arraste pela alça para mudar a ordem.</p>
      )}
      <AreaOrdenavel id="ordem-fotos" itens={lista} aoSoltar={aoSoltar} grade nome={nome}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {lista.map((img, i) => (
            <ItemOrdenavel
              key={img.id}
              id={img.id}
              rotulo={`foto ${i + 1}`}
              className="overflow-hidden rounded-lg border border-border bg-white"
            >
              {(alca) => (
                <>
                  <div className="relative aspect-[4/3] bg-cream">
                    <Image
                      src={`/api/imagens/${img.id}`}
                      alt={`Foto ${i + 1}`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-contain"
                      unoptimized
                    />
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-marian-deep/90 px-2 py-0.5 font-sans-body text-[11px] font-bold text-white">
                        Principal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-2">
                    {lista.length > 1 && alca}
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
                </>
              )}
            </ItemOrdenavel>
          ))}
        </ul>
      </AreaOrdenavel>
      <AvisoOrdem erro={erro} salvando={salvando} />
    </div>
  );
}
