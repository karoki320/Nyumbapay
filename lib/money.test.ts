import { describe, expect, it } from "vitest";
import { ksh, msisdn, parseKsh, periodOf, shiftPeriod } from "./money";

describe("money", () => {
  it("formats cents", () => expect(ksh(2500000)).toBe("KSh 25,000"));
  it("parses", () => {
    expect(parseKsh("9,000")).toBe(900000);
    expect(parseKsh("KSh 9 000.5")).toBe(900050);
    expect(parseKsh("0")).toBeNull();
    expect(parseKsh("-5")).toBeNull();
    expect(parseKsh("abc")).toBeNull();
    expect(parseKsh("1.234")).toBeNull();
  });
  it("periods", () => {
    expect(periodOf("2026-09")).toBe("2026-09-01");
    // 31 Aug 22:30 UTC is already September in Nairobi
    expect(periodOf(new Date("2026-08-31T22:30:00Z"))).toBe("2026-09-01");
    expect(shiftPeriod("2026-01-01", -1)).toBe("2025-12-01");
  });
  it("msisdn", () => {
    expect(msisdn("0712 345 678")).toBe("254712345678");
    expect(msisdn("+254 111 222 333")).toBe("254111222333");
    expect(msisdn("12345")).toBeNull();
  });
});
