import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" só faz sentido dentro do Next; nos testes de unidade, vazio.
      "server-only": fileURLToPath(new URL("./tests/unidade/vazio.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/unidade/**/*.test.ts"],
  },
});
