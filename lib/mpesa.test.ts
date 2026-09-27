import { describe, expect, it } from "vitest";
import { amountToCents, payerName, safeEqual, transTime } from "./mpesa";

describe("mpesa", () => {
  it("amounts", () => {
    expect(amountToCents("25000.00")).toBe(2500000);
    expect(amountToCents(650)).toBe(65000);
    expect(amountToCents("0")).toBeNull();
    expect(amountToCents("1e5")).toBeNull();
  });
  it("time is Nairobi", () => expect(transTime("20260806094100")).toBe("2026-08-06T06:41:00.000Z"));
  it("payer", () => expect(payerName({ TransID: "x", TransTime: "", TransAmount: 1, BusinessShortCode: 1, FirstName: "JOHN", LastName: "DOE" })).toBe("JOHN DOE"));
  it("safeEqual", () => { expect(safeEqual("abc", "abc")).toBe(true); expect(safeEqual("abc", "abd")).toBe(false); expect(safeEqual("a", "ab")).toBe(false); });
});
