import "server-only";
import { headers } from "next/headers";

/**
 * IP do visitante, só para limitar abuso (nunca vai para o banco além da
 * chave de limite nem para log).
 *
 * Atrás do proxy do Coolify, o último endereço de X-Forwarded-For é o que o
 * proxy viu; os anteriores vêm do navegador e podem ser inventados.
 */
export function ipDosCabecalhos(xForwardedFor: string | null, xRealIp: string | null) {
  const ultimo = xForwardedFor?.split(",").map((p) => p.trim()).filter(Boolean).pop();
  const ip = ultimo || xRealIp?.trim() || "";
  return /^[0-9a-f.:]{2,45}$/i.test(ip) ? ip.toLowerCase() : "desconhecido";
}

export async function ipDoCliente() {
  const h = await headers();
  return ipDosCabecalhos(h.get("x-forwarded-for"), h.get("x-real-ip"));
}
