"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { botaoPrimario, campo, rotulo } from "@/components/admin/estilos";
import { formatBrazilianPhone } from "@/lib/phone";
import { entrarNoPainel, type EstadoLogin } from "./acoes";

export default function FormularioLogin() {
  const [estado, enviar, enviando] = useActionState<EstadoLogin, FormData>(entrarNoPainel, {});
  const [celular, setCelular] = useState("");

  return (
    <form action={enviar} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="celular" className={rotulo}>
          Celular
        </label>
        <input
          id="celular"
          name="celular"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          value={celular}
          onChange={(e) => setCelular(formatBrazilianPhone(e.target.value))}
          required
          disabled={enviando}
          className={campo}
          placeholder="(83) 99999-9999"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="senha" className={rotulo}>
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          maxLength={200}
          required
          disabled={enviando}
          className={campo}
        />
      </div>

      {estado.erro && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {estado.erro}
        </p>
      )}

      <button type="submit" disabled={enviando} className={`${botaoPrimario} w-full`}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
