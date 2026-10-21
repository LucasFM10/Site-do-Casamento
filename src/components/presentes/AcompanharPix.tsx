"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";

const INTERVALO_MS = 5000;

/**
 * Código copia e cola do Pix e espera pela confirmação: consulta o status a
 * cada 5 s (com a aba visível) e recarrega a página quando o pagamento sai
 * de "pendente". Depois do vencimento, para de consultar.
 */
export default function AcompanharPix({
  pedidoId,
  codigo,
  expiraEm,
}: {
  pedidoId: string;
  codigo: string;
  expiraEm: string;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [expirou, setExpirou] = useState(false);

  useEffect(() => {
    const limite = expiraEm ? new Date(expiraEm).getTime() + 2 * 60_000 : Infinity;
    let ativo = true;

    const consultar = async () => {
      if (Date.now() > limite) {
        setExpirou(true);
        return;
      }
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/pedidos/${pedidoId}`, { cache: "no-store" });
        if (!r.ok) return;
        const { status } = (await r.json()) as { status?: string };
        if (ativo && status && status !== "pendente") router.refresh();
      } catch {
        // Sem rede: tenta de novo no próximo intervalo.
      }
    };

    const timer = setInterval(consultar, INTERVALO_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [pedidoId, expiraEm, router]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // Sem permissão de área de transferência: seleciona o texto para copiar à mão.
      const campo = document.getElementById("codigo-pix") as HTMLTextAreaElement | null;
      campo?.select();
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="space-y-4">
      <label htmlFor="codigo-pix" className="block font-sans-body text-sm font-bold text-marian-deep">
        Pix copia e cola
      </label>
      <textarea
        id="codigo-pix"
        readOnly
        value={codigo}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none break-all rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={copiar}
        className="btn-submit flex w-full items-center justify-center gap-2 font-sans-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {copiado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copiado ? "Código copiado!" : "Copiar código Pix"}
      </button>

      <p className="flex items-center justify-center gap-2 pt-2 font-sans-body text-sm text-muted-foreground" role="status">
        {expirou ? (
          "Este Pix venceu. Se você já pagou, a confirmação pode levar alguns minutos."
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Aguardando o pagamento. Esta página se atualiza sozinha.
          </>
        )}
      </p>
    </div>
  );
}
