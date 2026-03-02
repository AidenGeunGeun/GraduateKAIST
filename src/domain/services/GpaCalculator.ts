import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";
import { Transcript } from "@/domain/models/Transcript";

function calculateGpaFromRecords(records: { credits: number; gradeFinal: Grade }[]): number {
  let numerator = 0;
  let denominator = 0;

  for (const record of records) {
    if (!record.gradeFinal.isGpaVisible || record.gradeFinal.points === null) {
      continue;
    }

    numerator += record.gradeFinal.points * record.credits;
    denominator += record.credits;
  }

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

export class GpaCalculator {
  static calculateCumulative(transcript: Transcript): number {
    return calculateGpaFromRecords(transcript.gpaRecords());
  }

  static calculateBySemester(transcript: Transcript): Map<Semester, number> {
    const result = new Map<Semester, number>();
    const grouped = new Map<string, { semester: Semester; records: ReturnType<Transcript["gpaRecords"]> }>();

    for (const record of transcript.gpaRecords()) {
      const key = record.semester.toString();
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, { semester: record.semester, records: [record] });
      } else {
        existing.records.push(record);
      }
    }

    for (const { semester, records } of grouped.values()) {
      result.set(semester, calculateGpaFromRecords(records));
    }

    return result;
  }

  static whatIf(
    currentGpa: number,
    currentCredits: number,
    additionalCredits: number,
    targetGrade: Grade,
  ): number {
    const gradePoints = targetGrade.points ?? 0;
    const nextTotalCredits = currentCredits + additionalCredits;

    if (nextTotalCredits === 0) {
      return 0;
    }

    return (
      currentGpa * currentCredits +
      gradePoints * additionalCredits
    ) / nextTotalCredits;
  }
}
