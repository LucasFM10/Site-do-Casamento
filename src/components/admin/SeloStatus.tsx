import { cn } from "@/lib/utils";
import { selo } from "./estilos";

const STATUS = {
  aprovado: { rotulo: "Pago", classe: "bg-marian-deep text-white" },
  pendente: { rotulo: "Aguardando", classe: "bg-gold/15 text-gold" },
  recusado: { rotulo: "Recusado", classe: "bg-muted text-muted-foreground" },
  cancelado: { rotulo: "Cancelado", classe: "bg-muted text-muted-foreground" },
  reembolsado: { rotulo: "Estornado", classe: "bg-destructive/10 text-destructive" },
} as const;

export const ROTULOS_STATUS = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.rotulo])) as Record<
  keyof typeof STATUS,
  string
>;

export default function SeloStatus({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status];
  return <span className={cn(selo, s.classe)}>{s.rotulo}</span>;
}
