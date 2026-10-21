"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { salvarPresente, type Resultado } from "@/app/admin/acoes";
import { reaisParaCampo } from "@/lib/dinheiro";
import { ajuda, botaoPrimario, campo, erroCampo, rotulo } from "./estilos";

type Presente = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  quantidadeMaxima: number | null;
  ativo: boolean;
};

export default function FormularioPresente({ presente }: { presente?: Presente }) {
  const [estado, enviar, enviando] = useActionState<Resultado, FormData>(salvarPresente, {});
  // Controlados: o React limpa o formulário depois da ação.
  const [valores, setValores] = useState({
    nome: presente?.nome ?? "",
    descricao: presente?.descricao ?? "",
    preco: presente ? reaisParaCampo(presente.precoCentavos) : "",
    quantidadeMaxima: presente?.quantidadeMaxima?.toString() ?? "",
    ativo: presente?.ativo ?? true,
  });
  const erros = estado.erros ?? {};
  const mudar = (nome: keyof typeof valores) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValores((v) => ({ ...v, [nome]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <form action={enviar} className="space-y-5">
      {presente && <input type="hidden" name="id" value={presente.id} />}

      <div className="space-y-2">
        <label htmlFor="nome" className={rotulo}>
          Nome
        </label>
        <input id="nome" name="nome" value={valores.nome} onChange={mudar("nome")} maxLength={160} className={campo} required />
        {erros.nome && <p className={erroCampo}>{erros.nome}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="descricao" className={rotulo}>
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          value={valores.descricao}
          onChange={mudar("descricao")}
          maxLength={2000}
          className={`${campo} resize-y`}
        />
        {erros.descricao && <p className={erroCampo}>{erros.descricao}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="preco" className={rotulo}>
            Valor (R$)
          </label>
          <input
            id="preco"
            name="preco"
            inputMode="decimal"
            value={valores.preco}
            onChange={mudar("preco")}
            placeholder="150,00"
            className={campo}
            required
          />
          {erros.preco && <p className={erroCampo}>{erros.preco}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="quantidadeMaxima" className={rotulo}>
            Quantidade máxima
          </label>
          <input
            id="quantidadeMaxima"
            name="quantidadeMaxima"
            inputMode="numeric"
            value={valores.quantidadeMaxima}
            onChange={mudar("quantidadeMaxima")}
            placeholder="Sem limite"
            className={campo}
          />
          <p className={ajuda}>Em branco: pode ser dado quantas vezes quiserem.</p>
          {erros.quantidadeMaxima && <p className={erroCampo}>{erros.quantidadeMaxima}</p>}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 font-sans-body text-sm text-foreground has-[:checked]:border-primary has-[:checked]:bg-secondary/60">
        <input
          type="checkbox"
          name="ativo"
          checked={valores.ativo}
          onChange={mudar("ativo")}
          className="h-4 w-4 accent-primary"
        />
        Disponível na lista de presentes
      </label>

      {estado.erro && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {estado.erro}
        </p>
      )}
      {estado.mensagem && (
        <p className="rounded-lg border border-primary/20 bg-secondary/60 px-4 py-3 text-sm text-marian-deep" role="status">
          {estado.mensagem}
        </p>
      )}

      <button type="submit" disabled={enviando} className={botaoPrimario}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {presente ? "Salvar alterações" : "Criar presente"}
      </button>
    </form>
  );
}
