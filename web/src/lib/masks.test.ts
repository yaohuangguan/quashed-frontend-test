import { describe, expect, it } from "vitest";
import { formatMoney, formatTimeAgo } from "./format.ts";
import {
  isoMonthToMasked,
  isoToMaskedDate,
  maskCardNumber,
  maskCvv,
  maskDate,
  maskMonth,
  parseMaskedDate,
  parseMaskedMonth,
} from "./masks.ts";

describe("date mask", () => {
  it.each([
    ["1", "1"],
    ["10", "10"],
    ["101", "10 / 1"],
    ["10102025", "10 / 10 / 2025"],
    ["10 / 10 / 20251", "10 / 10 / 2025"],
    ["ab10cd10", "10 / 10"],
  ])("masks %j as %j", (input, expected) => {
    expect(maskDate(input)).toBe(expected);
  });

  it.each([
    ["10 / 10 / 2025", "2025-10-10"],
    ["29 / 02 / 2028", "2028-02-29"],
    ["29 / 02 / 2027", null],
    ["31 / 04 / 2026", null],
    ["00 / 01 / 2026", null],
    ["10 / 13 / 2026", null],
    ["10 / 10 / 202", null],
  ])("parses %j as %j", (input, expected) => {
    expect(parseMaskedDate(input)).toBe(expected);
  });

  it("round-trips an ISO date", () => {
    expect(isoToMaskedDate("2025-10-10")).toBe("10 / 10 / 2025");
  });
});

describe("month mask", () => {
  it.each([
    ["1", "1"],
    ["122", "12 / 2"],
    ["122025", "12 / 2025"],
  ])("masks %j as %j", (input, expected) => {
    expect(maskMonth(input)).toBe(expected);
  });

  it.each([
    ["12 / 2025", { month: 12, year: 2025 }],
    ["01 / 2030", { month: 1, year: 2030 }],
    ["13 / 2025", null],
    ["00 / 2025", null],
    ["12 / 202", null],
  ])("parses %j as %j", (input, expected) => {
    expect(parseMaskedMonth(input)).toEqual(expected);
  });

  it("converts a month input value", () => {
    expect(isoMonthToMasked("2025-12")).toBe("12 / 2025");
  });
});

describe("card masks", () => {
  it.each([
    ["1234567891011121", "1234 5678 9101 1121"],
    ["1234 5678 9101 1121", "1234 5678 9101 1121"],
    ["12345", "1234 5"],
    ["1234-5678", "1234 5678"],
    ["12345678901234567890", "1234 5678 9012 3456 789"],
  ])("groups %j as %j", (input, expected) => {
    expect(maskCardNumber(input)).toBe(expected);
  });

  it("keeps at most four CVV digits", () => {
    expect(maskCvv("3a3-45")).toBe("3345");
  });
});

describe("formatMoney", () => {
  it.each([
    [10688, "$106.88"],
    [9845, "$98.45"],
    [100000, "$1,000"],
    [1200, "$12"],
    [5, "$0.05"],
  ])("formats %i cents as %j", (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  it.each([
    ["2026-11-08T11:59:30Z", "just now"],
    ["2026-11-08T11:47:00Z", "13 min ago"],
    ["2026-11-08T11:00:01Z", "59 min ago"],
    ["2026-11-08T11:00:00Z", "1 h ago"],
    ["2026-11-07T12:00:00Z", "1 day ago"],
    ["2026-11-05T12:00:00Z", "3 days ago"],
  ])("formats %s", (iso, expected) => {
    expect(formatTimeAgo(iso, now)).toBe(expected);
  });
});
