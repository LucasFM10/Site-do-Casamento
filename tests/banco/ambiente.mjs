// PostgreSQL de verdade para os testes, num container Docker descartável
// (postgres:17-alpine, a mesma imagem do docker-compose.yaml), com as
// migrações aplicadas pelo migrador do repositório (dist/migrar.cjs, gerado
// por `npm run db:empacotar`), do mesmo jeito que no deploy.
//
// Cada Ambiente cria um banco e um papel do site próprios, então os arquivos
// de teste não se atrapalham. Sem Docker, os testes são pulados.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import postgres from "postgres";

const RAIZ = resolve(import.meta.dirname, "../..");
export const MIGRADOR = resolve(RAIZ, "dist/migrar.cjs");
const IMAGEM = "postgres:17-alpine";
export const DONO = { usuario: "dono", senha: "senha-do-dono-de-teste" };

const docker = (...args) => spawnSync("docker", args, { encoding: "utf8" });
export const semDocker = docker("info").status !== 0 ? "Docker indisponível" : false;
export const pular = semDocker || (!existsSync(MIGRADOR) && "rode npm run db:empacotar");

const aleatorio = () => randomBytes(4).toString("hex");

function portaLivre() {
  return new Promise((ok, falha) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
    s.on("error", falha);
  });
}

/** Container do PostgreSQL. A porta local é fixa: sobrevive a um reinício. */
export class Postgres {
  async iniciar() {
    this.nome = `casamento-teste-pg-${aleatorio()}`;
    this.host = "127.0.0.1";
    this.porta = await portaLivre();
    const r = docker(
      "run", "-d", "--rm", "--name", this.nome,
      "-e", `POSTGRES_USER=${DONO.usuario}`, "-e", `POSTGRES_PASSWORD=${DONO.senha}`,
      "-p", `127.0.0.1:${this.porta}:5432`, IMAGEM,
    );
    if (r.status !== 0) throw new Error(`docker run falhou: ${r.stderr}`);
    await this.aguardar();
  }

  /** Espera aceitar conexões (a imagem reinicia o servidor no fim da criação). */
  async aguardar() {
    for (let i = 0; i < 120; i++) {
      const sql = this.conectar("postgres", DONO);
      try {
        await sql`select 1`;
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        await sql.end({ timeout: 1 });
      }
    }
    throw new Error("PostgreSQL não respondeu.");
  }

  async reiniciar() {
    docker("restart", this.nome);
    await this.aguardar();
  }

  async parar() {
    if (this.nome) docker("rm", "-f", this.nome);
  }

  conectar(banco, { usuario, senha }) {
    return postgres({
      host: this.host, port: this.porta, database: banco, username: usuario, password: senha,
      max: 3, onnotice: () => {}, connect_timeout: 5,
    });
  }
}

/** Um banco da aplicação dentro do container, com papel do site próprio. */
export class Ambiente {
  constructor(pg) {
    this.pg = pg;
    this.banco = `casamento_${aleatorio()}`;
    this.site = { usuario: `site_${aleatorio()}`, senha: `senha-do-site-${aleatorio()}-teste` };
    this.conexoes = [];
  }

  async criar() {
    const sql = this.pg.conectar("postgres", DONO);
    await sql`create database ${sql(this.banco)}`;
    await sql.end();
  }

  /** Variáveis de ambiente do migrador e do site. */
  env(extra = {}) {
    return {
      PGHOST: this.pg.host,
      PGPORT: String(this.pg.porta),
      PGDATABASE: this.banco,
      POSTGRES_USER: DONO.usuario,
      POSTGRES_PASSWORD: DONO.senha,
      PGUSER: this.site.usuario,
      PGPASSWORD: this.site.senha,
      ...extra,
    };
  }

  /** Roda o migrador como no deploy. Devolve { status, log }. */
  migrar(extra = {}) {
    const r = spawnSync(process.execPath, [MIGRADOR], {
      cwd: RAIZ,
      env: { ...process.env, ...this.env(extra) },
      encoding: "utf8",
    });
    return { status: r.status, log: r.stdout + r.stderr };
  }

  comoDono() {
    const c = this.pg.conectar(this.banco, DONO);
    this.conexoes.push(c);
    return c;
  }

  comoSite(senha = this.site.senha) {
    const c = this.pg.conectar(this.banco, { usuario: this.site.usuario, senha });
    this.conexoes.push(c);
    return c;
  }

  async limpar() {
    await Promise.all(this.conexoes.map((c) => c.end({ timeout: 1 })));
    const sql = this.pg.conectar("postgres", DONO);
    await sql`drop database if exists ${sql(this.banco)} with (force)`;
    await sql`drop role if exists ${sql(this.site.usuario)}`;
    await sql.end();
  }
}

/** Código do erro do PostgreSQL ("42501", "23503"…), ou "ok". */
export async function codigo(promessa) {
  try {
    await promessa;
    return "ok";
  } catch (erro) {
    return erro.code ?? String(erro);
  }
}
