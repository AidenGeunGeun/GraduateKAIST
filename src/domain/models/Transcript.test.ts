import { describe, expect, it } from "vitest";

import { CourseCode } from "@/domain/models/CourseCode";
import { Grade } from "@/domain/models/Grade";
import { Transcript } from "@/domain/models/Transcript";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("T5 Retake filtering in Transcript", () => {
  it("T5.1 includes only Y record when Z and Y exist", () => {
    const z = createRecord({ retakeFlag: "Z", gradeFinal: Grade.from("B0") });
    const y = createRecord({ retakeFlag: "Y", gradeFinal: Grade.from("A+") });

    const transcript = Transcript.from([z, y]);
    expect(transcript.activeRecords()).toHaveLength(1);
    expect(transcript.activeRecords()[0].gradeFinal.display).toBe("A+");
  });

  it("T5.2 excludes Z record even if old grade was W", () => {
    const z = createRecord({ retakeFlag: "Z", gradeFinal: Grade.from("W") });
    const y = createRecord({ retakeFlag: "Y", gradeFinal: Grade.from("A-") });

    const transcript = Transcript.from([z, y]);
    expect(transcript.activeRecords()).toHaveLength(1);
    expect(transcript.activeRecords()[0].gradeFinal.display).toBe("A-");
  });

  it("T5.3 keeps Y(F) as active", () => {
    const yFail = createRecord({ retakeFlag: "Y", gradeFinal: Grade.from("F") });

    const transcript = Transcript.from([yFail]);
    expect(transcript.activeRecords()).toHaveLength(1);
    expect(transcript.activeRecords()[0].lifecycleState).toBe("Failed");
  });

  it("T5.4 keeps N(F) without retake as active", () => {
    const failed = createRecord({ retakeFlag: "N", gradeFinal: Grade.from("F") });

    const transcript = Transcript.from([failed]);
    expect(transcript.activeRecords()).toHaveLength(1);
    expect(transcript.activeRecords()[0].lifecycleState).toBe("Failed");
  });

  it("T5.5 excludes all Z records when one Y exists", () => {
    const z1 = createRecord({
      retakeFlag: "Z",
      gradeFinal: Grade.from("A0"),
      courseCode: CourseCode.from("AE210", "AE.21000"),
    });
    const z2 = createRecord({
      retakeFlag: "Z",
      gradeFinal: Grade.from("B0"),
      courseCode: CourseCode.from("AE210", "AE.21000"),
    });
    const y = createRecord({
      retakeFlag: "Y",
      gradeFinal: Grade.from("A+"),
      courseCode: CourseCode.from("AE210", "AE.21000"),
    });

    const transcript = Transcript.from([z1, z2, y]);
    expect(transcript.activeRecords()).toHaveLength(1);
    expect(transcript.activeRecords()[0].retakeFlag).toBe("Y");
  });
});
