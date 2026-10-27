import { describe, expect, it } from "vitest";
import { parseMagnitude, parseStateNumber } from "./parsers";

describe("parseMagnitude", () => {
  it("allows zero only when explicitly requested", () => {
    expect(parseMagnitude("0")).toBeNull();
    expect(parseMagnitude("0", true)).toBe(0);
    expect(parseMagnitude("", true)).toBeNull();
  });

  it("continues to parse positive magnitudes", () => {
    expect(parseMagnitude("5.4M")).toBe(5_400_000);
    expect(parseMagnitude("5,453,196")).toBe(5_453_196);
  });
});

describe("parseStateNumber", () => {
  it("accepts state numbers through 9999 only", () => {
    expect(parseStateNumber("9999")).toBe(9999);
    expect(parseStateNumber("10000")).toBeNull();
  });
});
