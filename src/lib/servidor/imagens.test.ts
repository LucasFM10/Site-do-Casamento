import { describe, expect, it } from "vitest";
import { tipoDaImagem, validarImagem } from "./imagens";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);

describe("tipoDaImagem", () => {
  it("reconhece JPEG, PNG e WebP pelos primeiros bytes", () => {
    expect(tipoDaImagem(JPEG)).toBe("image/jpeg");
    expect(tipoDaImagem(PNG)).toBe("image/png");
    expect(tipoDaImagem(WEBP)).toBe("image/webp");
  });

  it("recusa SVG, HTML e arquivo vazio", () => {
    expect(tipoDaImagem(new Uint8Array(Buffer.from("<svg onload=alert(1)>")))).toBeNull();
    expect(tipoDaImagem(new Uint8Array(Buffer.from("<!doctype html>")))).toBeNull();
    expect(tipoDaImagem(new Uint8Array())).toBeNull();
  });
});

describe("validarImagem", () => {
  it("confere tamanho, tipo e dimensões", () => {
    expect(validarImagem(JPEG, 800, 600)).toEqual({ ok: true, tipo: "image/jpeg" });
    expect(validarImagem(new Uint8Array(1_500_001), 800, 600)).toEqual({ ok: false, erro: "tamanho" });
    expect(validarImagem(new Uint8Array([1, 2, 3]), 800, 600)).toEqual({ ok: false, erro: "tipo" });
    expect(validarImagem(PNG, 0, 600)).toEqual({ ok: false, erro: "dimensoes" });
    expect(validarImagem(PNG, 800, Number.NaN)).toEqual({ ok: false, erro: "dimensoes" });
  });
});
