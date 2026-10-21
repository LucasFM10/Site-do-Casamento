/**
 * CSV para Excel em português: separador ";", BOM para acentos e proteção
 * contra fórmulas (célula começando com = + - @ vira texto).
 */
function celula(valor: string | number) {
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function gerarCsv(cabecalho: string[], linhas: (string | number)[][]) {
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n") + "\r\n";
}
