import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

if (!existsSync(resolve(projectRoot, ".env"))) {
  console.error("Arquivo .env não encontrado. Copie .env.example para .env e preencha os secrets antes de iniciar.");
  process.exit(1);
}

const composeFiles = ["compose.yaml", "compose.local.yaml", "compose.dev.yaml"];
const args = ["compose", ...composeFiles.flatMap((file) => ["-f", file]), "up", "--build"];

const docker = spawn("docker", args, {
  cwd: projectRoot,
  stdio: "inherit",
});

docker.on("error", (error) => {
  console.error(`Não foi possível iniciar o Docker: ${error.message}`);
  process.exit(1);
});

docker.on("exit", (code) => process.exit(code ?? 1));
