import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone com um server.js mínimo para a imagem Docker.
  output: "standalone",
  // Fotos enviadas pelo painel chegam reduzidas pelo navegador (até 1,5 MB).
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // CSP fica para quando o checkout entrar: o SDK do Mercado Pago exige uma
  // lista cuidadosa de origens.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
