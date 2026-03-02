interface AdmissionYearSelectorProps {
  years: number[];
  value: number | null;
  onChange: (value: number | null) => void;
}

export function AdmissionYearSelector({ years, value, onChange }: AdmissionYearSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="admission-year" className="text-xs font-medium text-text-muted">
        입학년도
      </label>
      <select
        id="admission-year"
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next ? Number(next) : null);
        }}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <option value="">입학년도를 선택하세요</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}{" "}
            {year === 2019
              ? "(2019)"
              : year <= 2021
                ? "(2020-2021)"
                : year === 2022
                  ? "(2022)"
                  : year <= 2024
                    ? "(2023-2024)"
                    : "(2025)"}
          </option>
        ))}
      </select>
    </div>
  );
}
