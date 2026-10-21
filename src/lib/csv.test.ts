import { describe, expect, it } from "vitest";
import { gerarCsv } from "./csv";

describe("gerarCsv", () => {
  it("separa por ponto e vírgula, com BOM, e escapa aspas e quebras", () => {
    expect(gerarCsv(["Nome", "Obs"], [["Ana", 'disse "oi"; tchau']])).toBe('﻿Nome;Obs\r\nAna;"disse ""oi""; tchau"\r\n');
  });

  it("neutraliza fórmulas de planilha", () => {
    expect(gerarCsv(["Nome"], [["=HYPERLINK(1)"], ["+55"], ["@x"], ["-1"]])).toBe(
      "﻿Nome\r\n'=HYPERLINK(1)\r\n'+55\r\n'@x\r\n'-1\r\n",
    );
  });
});
