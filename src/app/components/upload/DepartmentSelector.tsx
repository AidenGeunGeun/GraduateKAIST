import type { DepartmentSelection } from "@/domain/types";

interface DepartmentOption {
  value: DepartmentSelection;
  label: string;
  supported: boolean;
}

interface DepartmentSelectorProps {
  value: DepartmentSelection | null;
  options: DepartmentOption[];
  onChange: (value: DepartmentSelection | null) => void;
}

export function DepartmentSelector({ value, options, onChange }: DepartmentSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="department" className="text-xs font-medium text-text-muted">
        학과
      </label>
      <select
        id="department"
        value={value ?? ""}
        onChange={(event) => onChange((event.target.value || null) as DepartmentSelection | null)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <option value="">학과를 선택하세요</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.supported ? "" : " - 공통 분석만"}
          </option>
        ))}
      </select>
      <p className="text-xs text-text-muted">AE, ME, CS, EE는 학과별 전공 분석을 지원합니다.</p>
    </div>
  );
}
