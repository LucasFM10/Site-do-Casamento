import { defineConfig } from "drizzle-kit";

// Só para gerar migrações a partir de src/db/esquema.ts (`npm run db:gerar`),
// o que não precisa de banco. Quem aplica as migrações é scripts/migrar.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/esquema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
});
