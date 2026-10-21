import "server-only";

/**
 * Lê uma variável de ambiente obrigatória. O erro cita só o nome, nunca
 * um valor.
 */
export function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente ${nome} não definida.`);
  }
  return valor;
}
