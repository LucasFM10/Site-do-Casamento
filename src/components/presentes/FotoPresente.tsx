import Image from "next/image";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Foto de um presente (imagem do banco) ou um marcador quando não há foto.
 * "conter" mostra a foto inteira, sem recorte, sobre um fundo claro;
 * "cobrir" preenche a caixa e pode cortar as bordas.
 */
export default function FotoPresente({
  id,
  alt,
  sizes,
  className,
  priority,
  ajuste = "cobrir",
}: {
  id: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  ajuste?: "cobrir" | "conter";
}) {
  return (
    <div className={cn("relative overflow-hidden", ajuste === "conter" ? "bg-cream" : "bg-secondary/60", className)}>
      {id ? (
        <Image
          src={`/api/imagens/${id}`}
          alt={alt}
          fill
          sizes={sizes}
          className={ajuste === "conter" ? "object-contain p-[6%]" : "object-cover"}
          unoptimized
          priority={priority}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gold/60">
          <Gift className="h-1/4 max-h-12 w-1/4 max-w-12" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
