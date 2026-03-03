import type { Season } from "@/domain/types";

const REGULAR_SEMESTER_PATTERN = /(\d{4})년\s*(봄|여름|가을|겨울)학기/;
const SEASON_ORDER: Record<Season, number> = {
  봄: 1,
  여름: 2,
  가을: 3,
  겨울: 4,
};

export class Semester {
  readonly year: number | null;

  readonly season: Season | null;

  readonly isPreEnrollment: boolean;

  private constructor(year: number | null, season: Season | null, isPreEnrollment: boolean) {
    this.year = year;
    this.season = season;
    this.isPreEnrollment = isPreEnrollment;
  }

  static tryFromText(raw: string): Semester | null {
    const normalized = raw.trim();

    if (normalized === "기이수 인정 학점") {
      return new Semester(null, null, true);
    }

    const match = normalized.match(REGULAR_SEMESTER_PATTERN);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const season = match[2] as Season;

    return new Semester(year, season, false);
  }

  static fromText(raw: string): Semester {
    const semester = Semester.tryFromText(raw);

    if (!semester) {
      throw new Error(`Invalid semester: ${raw}`);
    }

    return semester;
  }

  static compare(a: Semester, b: Semester): number {
    if (a.isPreEnrollment && b.isPreEnrollment) {
      return 0;
    }

    if (a.isPreEnrollment) {
      return -1;
    }

    if (b.isPreEnrollment) {
      return 1;
    }

    if (a.year !== b.year) {
      return (a.year ?? 0) - (b.year ?? 0);
    }

    return SEASON_ORDER[a.season as Season] - SEASON_ORDER[b.season as Season];
  }

  toString(): string {
    if (this.isPreEnrollment) {
      return "기이수 인정 학점";
    }

    return `${this.year}년 ${this.season}학기`;
  }
}
