import { describe, expect, it } from "vitest";

import { Grade } from "@/domain/models/Grade";

describe("T1 Grade Value Object", () => {
  it("T1.1 converts A+ to 4.3", () => {
    expect(Grade.from("A+").points).toBe(4.3);
  });

  it("T1.2 converts B0 to 3.0", () => {
    expect(Grade.from("B0").points).toBe(3.0);
  });

  it("T1.3 marks F as GPA-visible", () => {
    expect(Grade.from("F").isGpaVisible).toBe(true);
  });

  it("T1.4 marks F as non-credit-earning", () => {
    expect(Grade.from("F").earnsCreditOnPass).toBe(false);
  });

  it("T1.5 converts F to 0.0", () => {
    expect(Grade.from("F").points).toBe(0);
  });

  it("T1.6 marks S as GPA-invisible", () => {
    expect(Grade.from("S").isGpaVisible).toBe(false);
  });

  it("T1.7 marks S as credit-earning", () => {
    expect(Grade.from("S").earnsCreditOnPass).toBe(true);
  });

  it("T1.8 marks P as credit-earning", () => {
    expect(Grade.from("P").earnsCreditOnPass).toBe(true);
  });

  it("T1.9 marks NR as non-credit-earning", () => {
    expect(Grade.from("NR").earnsCreditOnPass).toBe(false);
  });

  it("T1.10 marks W as GPA-invisible", () => {
    expect(Grade.from("W").isGpaVisible).toBe(false);
  });

  it("T1.11 marks W as non-credit-earning", () => {
    expect(Grade.from("W").earnsCreditOnPass).toBe(false);
  });

  it("T1.12 throws for invalid grade", () => {
    expect(() => Grade.from("X")).toThrow(/invalid grade/i);
  });
});
