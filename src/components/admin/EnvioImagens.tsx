"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { enviarImagemAcao } from "@/app/admin/acoes";
import { botaoSecundario } from "./estilos";

/** Abaixo do limite do servidor (1,5 MB), com folga para o envio. */
const MAX_BYTES = 1_400_000;

/**
 * Reduz a foto no navegador antes de enviar: lado maior até `maxLado` px,
 * em JPEG. Fotos de celular (5–10 MB) chegam ao servidor com algumas
 * centenas de KB. A orientação da câmera (EXIF) já vem aplicada.
 */
async function reduzir(arquivo: File, maxLado: number) {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  // Fundo branco: PNG transparente vira JPEG sem fundo preto.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  for (const qualidade of [0.85, 0.75, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
    if (blob && blob.size <= MAX_BYTES) return { blob, largura, altura };
  }
  throw new Error("Imagem grande demais.");
}

export default function EnvioImagens({
  grupo,
  presenteId,
  maxLado,
}: {
  grupo: "presente" | "carrossel";
  presenteId?: string;
  maxLado: number;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);

  const enviar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    const lista = [...arquivos];
    const novosErros: string[] = [];

    for (const [i, arquivo] of lista.entries()) {
      setProgresso(`Enviando ${i + 1} de ${lista.length}...`);
      try {
        const { blob, largura, altura } = await reduzir(arquivo, maxLado);
        const form = new FormData();
        form.set("grupo", grupo);
        if (presenteId) form.set("presenteId", presenteId);
        form.set("largura", String(largura));
        form.set("altura", String(altura));
        form.set("arquivo", blob, "foto.jpg");
        const r = await enviarImagemAcao(form);
        if (r.erro) novosErros.push(`${arquivo.name}: ${r.erro}`);
      } catch {
        novosErros.push(`${arquivo.name}: não foi possível ler esta imagem. Use JPEG, PNG ou WebP.`);
      }
    }

    setProgresso(null);
    setErros(novosErros);
    if (entrada.current) entrada.current.value = "";
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <input
        ref={entrada}
        id={`envio-${grupo}`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => enviar(e.target.files)}
        disabled={progresso !== null}
      />
      <label
        htmlFor={`envio-${grupo}`}
        className={`${botaoSecundario} cursor-pointer ${progresso ? "pointer-events-none opacity-60" : ""}`}
      >
        {progresso ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
        {progresso ?? "Adicionar fotos"}
      </label>
      <p className="font-sans-body text-xs text-muted-foreground">
        JPEG, PNG ou WebP. As fotos são reduzidas automaticamente antes do envio.
      </p>
      {erros.length > 0 && (
        <ul className="space-y-1 text-sm text-destructive" role="alert">
          {erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
