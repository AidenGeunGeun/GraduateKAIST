type GradeMeta = {
  points: number | null;
  isGpaVisible: boolean;
  earnsCreditOnPass: boolean;
};

const GRADE_TABLE: Record<string, GradeMeta> = {
  "A+": { points: 4.3, isGpaVisible: true, earnsCreditOnPass: true },
  A0: { points: 4.0, isGpaVisible: true, earnsCreditOnPass: true },
  "A-": { points: 3.7, isGpaVisible: true, earnsCreditOnPass: true },
  "B+": { points: 3.3, isGpaVisible: true, earnsCreditOnPass: true },
  B0: { points: 3.0, isGpaVisible: true, earnsCreditOnPass: true },
  "B-": { points: 2.7, isGpaVisible: true, earnsCreditOnPass: true },
  "C+": { points: 2.3, isGpaVisible: true, earnsCreditOnPass: true },
  C0: { points: 2.0, isGpaVisible: true, earnsCreditOnPass: true },
  "C-": { points: 1.7, isGpaVisible: true, earnsCreditOnPass: true },
  "D+": { points: 1.3, isGpaVisible: true, earnsCreditOnPass: true },
  D0: { points: 1.0, isGpaVisible: true, earnsCreditOnPass: true },
  "D-": { points: 0.7, isGpaVisible: true, earnsCreditOnPass: true },
  F: { points: 0.0, isGpaVisible: true, earnsCreditOnPass: false },
  S: { points: null, isGpaVisible: false, earnsCreditOnPass: true },
  U: { points: null, isGpaVisible: false, earnsCreditOnPass: false },
  W: { points: null, isGpaVisible: false, earnsCreditOnPass: false },
  R: { points: null, isGpaVisible: false, earnsCreditOnPass: false },
  I: { points: null, isGpaVisible: false, earnsCreditOnPass: false },
  P: { points: null, isGpaVisible: false, earnsCreditOnPass: true },
  NR: { points: null, isGpaVisible: false, earnsCreditOnPass: false },
};

export class Grade {
  static readonly UNKNOWN = new Grade("UNKNOWN", {
    points: null,
    isGpaVisible: false,
    earnsCreditOnPass: false,
  });

  readonly display: string;

  readonly points: number | null;

  readonly isGpaVisible: boolean;

  readonly earnsCreditOnPass: boolean;

  private constructor(display: string, meta: GradeMeta) {
    this.display = display;
    this.points = meta.points;
    this.isGpaVisible = meta.isGpaVisible;
    this.earnsCreditOnPass = meta.earnsCreditOnPass;
  }

  static tryFrom(raw: string): Grade | null {
    const normalized = raw.trim().toUpperCase();
    const meta = GRADE_TABLE[normalized];

    if (!meta) {
      return null;
    }

    return new Grade(normalized, meta);
  }

  static from(raw: string): Grade {
    const grade = Grade.tryFrom(raw);

    if (!grade) {
      throw new Error(`Invalid grade: ${raw}`);
    }

    return grade;
  }
}
