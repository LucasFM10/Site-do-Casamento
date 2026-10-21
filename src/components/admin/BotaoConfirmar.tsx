"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

function Enviar({ className, children }: { className: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/**
 * Botão de ação destrutiva em dois passos (sem janela do navegador): o
 * primeiro clique pede confirmação, o segundo envia o formulário.
 */
export default function BotaoConfirmar({
  acao,
  campos,
  rotulo,
  confirmar,
  className,
  aviso,
}: {
  acao: (form: FormData) => Promise<void>;
  campos: Record<string, string>;
  rotulo: ReactNode;
  confirmar: string;
  className: string;
  aviso?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" className={className} onClick={() => setConfirmando(true)}>
        {rotulo}
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-wrap items-center gap-2">
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      {aviso && <p className="w-full font-sans-body text-sm text-muted-foreground">{aviso}</p>}
      <Enviar className={className}>{confirmar}</Enviar>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="px-2 font-sans-body text-sm font-bold text-muted-foreground hover:text-marian-deep"
      >
        Cancelar
      </button>
    </form>
  );
}
