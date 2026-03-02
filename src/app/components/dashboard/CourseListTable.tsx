"use client";

import { useMemo, useState } from "react";

import type { CourseRecord } from "@/domain/models/CourseRecord";
import { Semester } from "@/domain/models/Semester";

interface CourseListTableProps {
  records: CourseRecord[];
}

function categoryLabel(value: string): string {
  if (value === "인선_인문") return "인선(인문)";
  if (value === "인선_사회") return "인선(사회)";
  if (value === "인선_예술") return "인선(예술)";
  if (value === "인선_인핵") return "인선(인핵)";
  return value;
}

export function CourseListTable({ records }: CourseListTableProps) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const semesterMap = new Map<string, { semester: Semester; items: CourseRecord[] }>();

    for (const record of records) {
      const key = record.semester.toString();
      const existing = semesterMap.get(key);
      if (!existing) {
        semesterMap.set(key, { semester: record.semester, items: [record] });
      } else {
        existing.items.push(record);
      }
    }

    return [...semesterMap.values()].sort((a, b) => Semester.compare(a.semester, b.semester));
  }, [records]);

  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-text">전체 과목 목록</h3>
        <span className="text-xs text-text-muted">{open ? "접기" : "펼치기"}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-4">
          {grouped.map(({ semester, items }) => (
            <div key={semester.toString()} className="space-y-1">
              <h4 className="text-xs font-semibold text-text-muted">{semester.toString()}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted">
                      <th className="px-2 py-1 text-left font-medium">코드</th>
                      <th className="px-2 py-1 text-left font-medium">과목명</th>
                      <th className="px-2 py-1 text-left font-medium">구분</th>
                      <th className="px-2 py-1 text-right font-medium">학점</th>
                      <th className="px-2 py-1 text-right font-medium">성적</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((record, index) => {
                      const stateClass =
                        record.lifecycleState === "Failed"
                          ? "bg-danger/10 text-danger"
                          : record.lifecycleState === "Superseded"
                            ? "text-text-muted line-through"
                            : record.lifecycleState === "Incomplete"
                              ? "bg-warning/10 text-warning"
                              : "text-text";

                      return (
                        <tr key={`${record.semester.toString()}-${record.courseCode.oldCode}-${record.section}-${record.gradeFinal.display}-${index}`} className={`border-b border-border/60 ${stateClass}`}>
                          <td className="px-2 py-1 font-mono">{record.courseCode.oldCode}</td>
                          <td className="px-2 py-1">{record.nameKo}</td>
                          <td className="px-2 py-1">{categoryLabel(record.category.value)}</td>
                          <td className="px-2 py-1 text-right">{record.credits}</td>
                          <td className="px-2 py-1 text-right">{record.gradeFinal.display}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
