import { describe, expect, it } from "vitest";

import {
  addRaw,
  amount,
  compareRaw,
  formatUsd,
  roundHalfUp,
  toDisplay,
} from "@/modules/Quote/utils/decimal";

describe("roundHalfUp", () => {
  it("rounds a half up, where toFixed rounds it down", () => {
    // The canonical float trap: 1.005 is stored as 1.00499999999999989...,
    // so (1.005).toFixed(2) is "1.00". A premium must round to 1.01.
    expect((1.005).toFixed(2)).toBe("1.00"); // documents the bug being avoided
    expect(roundHalfUp("1.005")).toBe("1.01");
    expect(roundHalfUp("2.675")).toBe("2.68"); // (2.675).toFixed(2) === "2.67"
    expect(roundHalfUp("8.165")).toBe("8.17");
  });

  it("rounds away from zero for negatives", () => {
    expect(roundHalfUp("-1.005")).toBe("-1.01");
    expect(roundHalfUp("-2.675")).toBe("-2.68");
    expect(roundHalfUp("-0.005")).toBe("-0.01");
  });

  it("leaves a value that is already at the target scale alone", () => {
    expect(roundHalfUp("21.15")).toBe("21.15");
    expect(roundHalfUp("0.00")).toBe("0.00");
  });

  it("pads out to the requested scale", () => {
    expect(roundHalfUp("7", 2)).toBe("7.00");
    expect(roundHalfUp("7.1", 4)).toBe("7.1000");
  });

  it("rounds strictly below a half down", () => {
    expect(roundHalfUp("1.00499")).toBe("1.00");
    expect(roundHalfUp("-1.00499")).toBe("-1.00");
  });

  it("carries across the integer boundary", () => {
    expect(roundHalfUp("9.995")).toBe("10.00");
    expect(roundHalfUp("0.999", 2)).toBe("1.00");
    expect(roundHalfUp("99.999", 0)).toBe("100");
  });

  it("handles the sheet's 4 dp amounts", () => {
    expect(roundHalfUp("217.9646")).toBe("217.96");
    expect(roundHalfUp("297.0663")).toBe("297.07");
    expect(roundHalfUp("2174.1592")).toBe("2174.16");
    expect(roundHalfUp("3.1725")).toBe("3.17");
    expect(roundHalfUp("1.1421")).toBe("1.14");
  });

  it("keeps precision that computing the premium as a float would lose", () => {
    // Deriving week 7's premium as 21.15 * 7 yields 148.04999999999998, which
    // is why the sheet's own strings are stored and never recomputed.
    expect(21.15 * 7).not.toBe(148.05); // documents the drift being avoided
    expect(roundHalfUp("148.0500")).toBe("148.05");
    expect(roundHalfUp("909.4500")).toBe("909.45"); // 21.15 * 43 drifts too
  });

  it("never renders a negative zero", () => {
    // A rounded-away negative is still zero; "-0.00" on an invoice line reads
    // as a bug to anyone looking at it.
    expect(roundHalfUp("-0.001")).toBe("0.00");
    expect(roundHalfUp("-0.0")).toBe("0.00");
    expect(formatUsd("-0.004")).toBe("$0.00");
  });

  it("rejects anything that is not a decimal string", () => {
    expect(() => roundHalfUp("abc")).toThrow(TypeError);
    expect(() => roundHalfUp("1,234.00")).toThrow(TypeError);
    expect(() => roundHalfUp("$1.00")).toThrow(TypeError);
    expect(() => roundHalfUp("")).toThrow(TypeError);
    expect(() => roundHalfUp("1e3")).toThrow(TypeError);
  });

  it("rejects a nonsensical scale", () => {
    expect(() => roundHalfUp("1.00", -1)).toThrow(RangeError);
    expect(() => roundHalfUp("1.00", 1.5)).toThrow(RangeError);
  });
});

describe("toDisplay", () => {
  it("is roundHalfUp at 2 dp", () => {
    expect(toDisplay("217.9646")).toBe("217.96");
    expect(toDisplay("180.0000")).toBe("180.00");
  });
});

describe("addRaw", () => {
  it("sums exactly at the widest scale present", () => {
    expect(addRaw("21.1500", "12.5000", "3.1725", "1.1421", "180.0000")).toBe("217.9646");
  });

  it("mixes scales without losing digits", () => {
    expect(addRaw("1.1", "2.22", "3.333")).toBe("6.653");
  });

  it("handles negatives and returns a signed result", () => {
    expect(addRaw("10.00", "-2.50")).toBe("7.50");
    expect(addRaw("2.50", "-10.00")).toBe("-7.50");
  });

  it("returns 0 for an empty sum", () => {
    expect(addRaw()).toBe("0");
  });

  it("does not accumulate float error over the whole rate table", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point.
    expect(addRaw("0.1", "0.2")).toBe("0.3");
  });
});

describe("compareRaw", () => {
  it("orders values regardless of trailing zeros", () => {
    expect(compareRaw("1.10", "1.1")).toBe(0);
    expect(compareRaw("1.10", "1.2")).toBe(-1);
    expect(compareRaw("2", "1.9999")).toBe(1);
  });

  it("orders negatives correctly", () => {
    expect(compareRaw("-1.00", "1.00")).toBe(-1);
    expect(compareRaw("-2.00", "-3.00")).toBe(1);
  });
});

describe("formatUsd", () => {
  it("groups thousands and keeps 2 dp", () => {
    expect(formatUsd("2174.1592")).toBe("$2,174.16");
    expect(formatUsd("217.9646")).toBe("$217.96");
    expect(formatUsd("0.0000")).toBe("$0.00");
  });

  it("groups values above a million", () => {
    expect(formatUsd("1000000.00")).toBe("$1,000,000.00");
  });

  it("puts the sign outside the symbol", () => {
    expect(formatUsd("-217.9646")).toBe("-$217.96");
  });

  it("honours a custom scale", () => {
    expect(formatUsd("217.9646", { dp: 4 })).toBe("$217.9646");
    expect(formatUsd("217.9646", { dp: 0 })).toBe("$218");
  });
});

describe("amount", () => {
  it("pairs the raw sheet string with its 2 dp display form", () => {
    expect(amount("217.9646")).toEqual({ raw: "217.9646", display: "217.96" });
  });

  it("is frozen so a page cannot rewrite a quoted figure", () => {
    const a = amount("21.1500");
    expect(Object.isFrozen(a)).toBe(true);
  });
});
