const formatoReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 15000 → "R$ 150,00". */
export function formatarReais(centavos: number) {
  return formatoReais.format(centavos / 100);
}

/** 15000 → "150,00", para preencher um campo de preço. */
export function reaisParaCampo(centavos: number) {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** Maior preço aceito: R$ 1.000.000,00. */
export const MAX_CENTAVOS = 100_000_000;

/**
 * Lê um valor em reais digitado ("150", "150,5", "1.500,00", "R$ 99,90") e
 * devolve em centavos, ou null se não for um valor válido maior que zero.
 */
export function lerReais(entrada: string): number | null {
  let texto = entrada.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!texto) return null;

  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    // "1.500": ponto como separador de milhar.
    texto = texto.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const [inteiro, fracao = ""] = texto.split(".");
  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos) || centavos < 1 || centavos > MAX_CENTAVOS) return null;
  return centavos;
}
