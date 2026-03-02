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
    const oldMatch = this.oldCode.match(/(\d+)/);
    if (oldMatch) {
      return Number(oldMatch[1]);
    }

    const newMatch = this.newCode.match(/\.(\d+)/);
    if (newMatch) {
      return Number(newMatch[1]);
    }

    return 0;
  }
}
