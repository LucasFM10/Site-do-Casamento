export function normalizeBrazilianPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatBrazilianPhone(value: string) {
  const digits = normalizeBrazilianPhone(value);

  if (!digits) return "";
  if (digits.length < 3) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  const prefixLength = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, prefixLength)}-${digits.slice(prefixLength)}`;
}

/** DDD (sem zero) + 8 ou 9 dígitos, o mesmo formato que o banco aceita. */
export function isValidBrazilianPhone(value: string) {
  return /^[1-9]{2}\d{8,9}$/.test(normalizeBrazilianPhone(value));
}

/** "(92) 99999-8888" → "5592999998888", formato do banco e do WhatsApp. */
export function toStoredBrazilianPhone(value: string) {
  return `55${normalizeBrazilianPhone(value)}`;
}
