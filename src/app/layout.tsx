import type { Metadata } from "next";
import { Cormorant_Garamond, Lato } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Casamento de Lucas & Amanda",
  description: "Informações e confirmação de presença para o casamento de Lucas e Amanda.",
  authors: [{ name: "Lucas & Amanda" }],
  openGraph: {
    title: "Casamento de Lucas & Amanda",
    description: "Informações e confirmação de presença para o casamento de Lucas e Amanda.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${cormorant.variable} ${lato.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
