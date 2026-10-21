"use client";

import { botaoPrimario, cartao } from "@/components/admin/estilos";

export default function ErroPainel({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`${cartao} mx-auto max-w-md text-center`}>
      <h1 className="font-serif-display text-2xl text-marian-deep">Algo deu errado</h1>
      <p className="mt-2 font-sans-body text-sm text-muted-foreground">
        Não foi possível concluir a operação. Tente de novo em instantes.
      </p>
      <button type="button" onClick={reset} className={`${botaoPrimario} mt-5`}>
        Tentar de novo
      </button>
    </div>
  );
}
