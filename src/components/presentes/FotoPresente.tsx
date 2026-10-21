import Image from "next/image";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

/** Foto de um presente (imagem do banco) ou um marcador quando não há foto. */
export default function FotoPresente({
  id,
  alt,
  sizes,
  className,
  priority,
}: {
  id: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-secondary/60", className)}>
      {id ? (
        <Image
          src={`/api/imagens/${id}`}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized
          priority={priority}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gold/60">
          <Gift className="h-12 w-12" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
