import { formatBrazilianPhone } from "@/lib/phone";

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Data e hora de Brasília: "21/10/2026, 14:30". */
export function formatarDataHora(data: Date) {
  return dataHora.format(data);
}

/** "5583999990001" → "(83) 99999-0001". */
export function formatarTelefone(telefone: string) {
  return telefone ? formatBrazilianPhone(telefone.replace(/^55/, "")) : "";
}

/** Link para conversar no WhatsApp. */
export function linkWhatsapp(telefone: string) {
  return `https://wa.me/${telefone.replace(/\D/g, "")}`;
}
