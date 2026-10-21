"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/admin", rotulo: "Resumo" },
  { href: "/admin/confirmacoes", rotulo: "Confirmações" },
  { href: "/admin/presentes", rotulo: "Presentes" },
  { href: "/admin/pedidos", rotulo: "Pedidos e mensagens" },
  { href: "/admin/informacoes", rotulo: "Informações" },
  { href: "/admin/fotos", rotulo: "Fotos" },
];

export default function NavAdmin() {
  const caminho = usePathname();
  return (
    <nav aria-label="Painel" className="-mx-5 overflow-x-auto px-5">
      <ul className="flex min-w-max gap-1">
        {ITENS.map((item) => {
          const atual = item.href === "/admin" ? caminho === "/admin" : caminho.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 font-sans-body text-sm font-bold transition",
                  atual ? "bg-marian-deep text-white" : "text-marian-deep hover:bg-cream",
                )}
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
