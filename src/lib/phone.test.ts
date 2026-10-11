import { describe, expect, it } from "vitest";
import { formatBrazilianPhone, isValidBrazilianPhone, normalizeBrazilianPhone } from "./phone";

describe("Brazilian phone helpers", () => {
  it("formats an eleven-digit mobile number", () => {
    expect(formatBrazilianPhone("92999998888")).toBe("(92) 99999-8888");
  });

  it("formats a ten-digit number", () => {
    expect(formatBrazilianPhone("9233334444")).toBe("(92) 3333-4444");
  });

  it("normalizes punctuation and limits input to eleven digits", () => {
    expect(normalizeBrazilianPhone("(92) 99999-8888 extra 123")).toBe("92999998888");
  });

  it("rejects numbers without DDD or with too many digits", () => {
    expect(isValidBrazilianPhone("9999-8888")).toBe(false);
    expect(isValidBrazilianPhone("(92) 99999-8888")).toBe(true);
  });
});
