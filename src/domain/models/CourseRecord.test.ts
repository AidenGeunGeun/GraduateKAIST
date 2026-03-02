import { describe, expect, it } from "vitest";

import { Grade } from "@/domain/models/Grade";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("T4 CourseRecord lifecycle state", () => {
  it("T4.1 sets Active for A+ with N flag", () => {
    const record = createRecord({ gradeFinal: Grade.from("A+"), retakeFlag: "N" });
    expect(record.lifecycleState).toBe("Active");
  });

  it("T4.2 sets Failed for F with N flag", () => {
    const record = createRecord({ gradeFinal: Grade.from("F"), retakeFlag: "N" });
    expect(record.lifecycleState).toBe("Failed");
  });

  it("T4.3 sets Superseded for Z regardless of grade", () => {
    const record = createRecord({ gradeFinal: Grade.from("A+"), retakeFlag: "Z" });
    expect(record.lifecycleState).toBe("Superseded");
  });

  it("T4.4 sets Incomplete for W", () => {
    const record = createRecord({ gradeFinal: Grade.from("W"), retakeFlag: "N" });
    expect(record.lifecycleState).toBe("Incomplete");
  });

  it("T4.5 sets Incomplete for R", () => {
    const record = createRecord({ gradeFinal: Grade.from("R") });
    expect(record.lifecycleState).toBe("Incomplete");
  });

  it("T4.6 sets Active for S", () => {
    const record = createRecord({ gradeFinal: Grade.from("S") });
    expect(record.lifecycleState).toBe("Active");
  });

  it("T4.7 sets Active for P", () => {
    const record = createRecord({ gradeFinal: Grade.from("P") });
    expect(record.lifecycleState).toBe("Active");
  });

  it("T4.8 prioritizes Superseded over Failed", () => {
    const record = createRecord({ gradeFinal: Grade.from("F"), retakeFlag: "Z" });
    expect(record.lifecycleState).toBe("Superseded");
  });

  it("T4.9 detects AU course", () => {
    const record = createRecord({ credits: 0, au: 2 });
    expect(record.isAuCourse).toBe(true);
  });

  it("T4.10 marks regular credit course as non-AU", () => {
    const record = createRecord({ credits: 3, au: 0 });
    expect(record.isAuCourse).toBe(false);
  });
});
