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

export function isValidBrazilianPhone(value: string) {
  return /^\d{10,11}$/.test(normalizeBrazilianPhone(value));
}
