"use client";

import { useActionState, useState } from "react";
import { Loader2, Phone, QrCode } from "lucide-react";
import { presentear, type EstadoCompra } from "@/app/presentes/acoes";
import { formatBrazilianPhone } from "@/lib/phone";
import { MAX_MENSAGEM } from "@/lib/presentes";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 font-sans-body text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "block font-sans-body text-sm font-bold text-marian-deep";

function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {texto}
    </p>
  );
}

/** Dados de quem presenteia e geração do Pix. Sem cadastro nem login. */
export default function FormularioCompra({ presenteId }: { presenteId: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoCompra, FormData>(presentear.bind(null, presenteId), {});
  // Campos controlados: o React limpa o formulário depois da ação, e o
  // convidado não deve perder o que digitou quando houver erro.
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [mensagem, setMensagem] = useState("");
  const erros = estado.erros ?? {};

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <label htmlFor="nome" className={labelClass}>
          Seu nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={120}
          required
          disabled={enviando}
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "nome-erro" : undefined}
          className={inputClass}
          placeholder="Como os noivos vão saber quem presenteou"
        />
        <Erro id="nome-erro" texto={erros.nome} />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          required
          disabled={enviando}
          aria-invalid={Boolean(erros.email)}
          aria-describedby={erros.email ? "email-erro" : "email-ajuda"}
          className={inputClass}
          placeholder="voce@exemplo.com"
        />
        <p id="email-ajuda" className="text-xs text-muted-foreground">
          Exigido pelo Mercado Pago para o comprovante.
        </p>
        <Erro id="email-erro" texto={erros.email} />
      </div>

      <div className="space-y-2">
        <label htmlFor="celular" className={labelClass}>
          WhatsApp <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="celular"
            name="celular"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={celular}
            onChange={(e) => setCelular(formatBrazilianPhone(e.target.value))}
            disabled={enviando}
            aria-invalid={Boolean(erros.telefone)}
            aria-describedby={erros.telefone ? "celular-erro" : "celular-ajuda"}
            className={`${inputClass} pl-11`}
            placeholder="(83) 99999-9999"
          />
        </div>
        <p id="celular-ajuda" className="text-xs text-muted-foreground">
          Para receber o agradecimento quando o pagamento for confirmado.
        </p>
        <Erro id="celular-erro" texto={erros.telefone} />
      </div>

      <div className="space-y-2">
        <label htmlFor="mensagem" className={labelClass}>
          Mensagem aos noivos <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={4}
          maxLength={MAX_MENSAGEM}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          disabled={enviando}
          aria-invalid={Boolean(erros.mensagem)}
          aria-describedby={erros.mensagem ? "mensagem-erro mensagem-contador" : "mensagem-contador"}
          className={`${inputClass} resize-y`}
          placeholder="Deixe um recado carinhoso"
        />
        <p id="mensagem-contador" className="text-right text-xs text-muted-foreground">
          {mensagem.length}/{MAX_MENSAGEM}
        </p>
        <Erro id="mensagem-erro" texto={erros.mensagem} />
      </div>

      {estado.erro && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="btn-submit flex w-full items-center justify-center gap-2 font-sans-body text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
        {enviando ? "Gerando Pix..." : "Presentear com Pix"}
      </button>
    </form>
  );
}
