export class CourseCode {
  readonly oldCode: string;

  readonly newCode: string;

  private constructor(oldCode: string, newCode: string) {
    this.oldCode = oldCode.trim().toUpperCase();
    this.newCode = newCode.trim().toUpperCase();
  }

  static from(oldCode: string, newCode: string): CourseCode {
    if (!oldCode.trim()) {
      throw new Error("oldCode is required");
    }

    return new CourseCode(oldCode, newCode);
  }

  get departmentPrefix(): string {
    const oldMatch = this.oldCode.match(/^[A-Z]+/);
    if (oldMatch) {
      return oldMatch[0];
    }

    const newMatch = this.newCode.match(/^[A-Z]+/);
    return newMatch?.[0] ?? "";
  }

  get numericPart(): number {
    const code = this.oldCode || this.newCode;
    const match = code.match(/(\d+)/);
    if (!match) {
      return 0;
    }

    const num = Number(match[1]);
    if (num >= 10000) {
      return Math.floor(num / 10000) * 100;
    }

    return num;
  }
}
