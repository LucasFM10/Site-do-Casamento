import type { Metadata } from "next";

// Fora da navegação pública e dos buscadores.
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel" },
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-cream">{children}</div>;
}
