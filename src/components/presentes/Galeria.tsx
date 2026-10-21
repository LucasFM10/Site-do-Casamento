"use client";

import { useState } from "react";
import Image from "next/image";
import FotoPresente from "./FotoPresente";
import { cn } from "@/lib/utils";

/** Foto principal do presente e miniaturas para trocar. */
export default function Galeria({ ids, nome }: { ids: string[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const idAtual = ids[atual] ?? null;

  return (
    <div>
      <FotoPresente
        id={idAtual}
        alt={ids.length > 1 ? `${nome} - foto ${atual + 1} de ${ids.length}` : nome}
        sizes="(min-width: 768px) 50vw, 100vw"
        className="aspect-[4/3] rounded-xl border border-gold/20"
        priority
      />
      {ids.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {ids.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === atual}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marian-deep",
                i === atual ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image src={`/api/imagens/${id}`} alt="" fill sizes="80px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
