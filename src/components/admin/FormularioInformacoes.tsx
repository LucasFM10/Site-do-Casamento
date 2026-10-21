"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { salvarInformacoes, type Resultado } from "@/app/admin/acoes";
import { GRUPOS_CONFIGURACAO, type Configuracoes } from "@/lib/configuracoes";
import { ajuda, botaoPrimario, campo, cartao, erroCampo, rotulo } from "./estilos";

const TIPO_ENTRADA = { texto: "text", data: "date", hora: "time", url: "url" } as const;

export default function FormularioInformacoes({ valores: iniciais }: { valores: Configuracoes }) {
  const [estado, enviar, enviando] = useActionState<Resultado, FormData>(salvarInformacoes, {});
  // Controlados: o React limpa o formulário depois da ação.
  const [valores, setValores] = useState(iniciais);
  const erros = estado.erros ?? {};

  return (
    <form action={enviar} className="space-y-6">
      {GRUPOS_CONFIGURACAO.map((grupo) => (
        <fieldset key={grupo.titulo} className={cartao}>
          <legend className="float-left mb-4 w-full font-serif-display text-2xl text-marian-deep">{grupo.titulo}</legend>
          <div className="clear-both grid gap-5 sm:grid-cols-2">
            {grupo.campos.map((c) => {
              const longo = c.tipo === "texto_longo";
              const props = {
                id: c.chave,
                name: c.chave,
                value: valores[c.chave],
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setValores((v) => ({ ...v, [c.chave]: e.target.value })),
                maxLength: c.max,
                required: "obrigatorio" in c && c.obrigatorio,
                "aria-invalid": Boolean(erros[c.chave]),
                className: longo ? `${campo} resize-y` : campo,
              };
              return (
                <div key={c.chave} className={`space-y-2 ${longo ? "sm:col-span-2" : ""}`}>
                  <label htmlFor={c.chave} className={rotulo}>
                    {c.rotulo}
                  </label>
                  {longo ? <textarea rows={4} {...props} /> : <input type={TIPO_ENTRADA[c.tipo]} {...props} />}
                  {"ajuda" in c && <p className={ajuda}>{c.ajuda}</p>}
                  {erros[c.chave] && <p className={erroCampo}>{erros[c.chave]}</p>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-4 border-t border-gold/20 bg-cream/95 px-5 py-4 backdrop-blur">
        <button type="submit" disabled={enviando} className={botaoPrimario}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar informações
        </button>
        {estado.erro && (
          <p className="text-sm text-destructive" role="alert">
            {estado.erro}
          </p>
        )}
        {estado.mensagem && (
          <p className="text-sm text-marian-deep" role="status">
            {estado.mensagem}
          </p>
        )}
      </div>
    </form>
  );
}
