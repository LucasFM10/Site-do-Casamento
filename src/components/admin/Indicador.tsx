import { cartao } from "./estilos";

export default function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string | number; detalhe?: string }) {
  return (
    <div className={cartao}>
      <p className="font-sans-body text-xs font-bold uppercase tracking-[0.16em] text-gold">{rotulo}</p>
      <p className="mt-1 font-serif-display text-4xl font-light text-marian-deep">{valor}</p>
      {detalhe && <p className="mt-1 font-sans-body text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}
