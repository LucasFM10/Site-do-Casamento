import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { presentes } from "@/db/esquema";
import { estaEsgotado, reservadosSql } from "./presentes";

describe("reservadosSql", () => {
  it("compara o pedido com o presente da consulta de fora, não com o próprio id", () => {
    const { sql } = drizzle.mock().select({ reservados: reservadosSql }).from(presentes).toSQL();
    expect(sql).toContain('pd.presente_id = "presentes"."id"');
  });
});

describe("estaEsgotado", () => {
  it("sem quantidade máxima nunca esgota", () => {
    expect(estaEsgotado(null, 1000)).toBe(false);
    expect(estaEsgotado(2, 1)).toBe(false);
    expect(estaEsgotado(2, 2)).toBe(true);
  });
});
