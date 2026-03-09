import type { DepartmentSelection } from "@/domain/types";

interface DepartmentOption {
  value: DepartmentSelection;
  label: string;
  supported: boolean;
}

interface DepartmentSelectorProps {
  id?: string;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  value: DepartmentSelection | null;
  options: DepartmentOption[];
  onChange: (value: DepartmentSelection | null) => void;
}

export function DepartmentSelector({
  id = "department",
  label = "주전공 학과",
  placeholder = "학과를 선택하세요",
  description = "AE, ME, CS, EE는 학과별 전공 분석을 지원합니다.",
  disabled = false,
  value,
  options,
  onChange,
}: DepartmentSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange((event.target.value || null) as DepartmentSelection | null)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.supported ? "" : " - 공통 분석만"}
          </option>
        ))}
      </select>
      <p className="text-xs text-text-muted">{description}</p>
    </div>
  );
}
