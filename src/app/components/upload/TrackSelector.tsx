import type { TrackType } from "@/domain/types";

interface TrackSelectorProps {
  value: TrackType;
  onChange: (value: TrackType) => void;
}

const TRACK_OPTIONS: TrackType[] = ["심화전공", "부전공", "복수전공", "자유융합전공"];

export function TrackSelector({ value, onChange }: TrackSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="track" className="text-xs font-medium text-text-muted">
        프로그램
      </label>
      <select
        id="track"
        value={value}
        onChange={(event) => onChange(event.target.value as TrackType)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
          {TRACK_OPTIONS.map((track) => (
            <option key={track} value={track}>
              {track}
              {track === "자유융합전공" ? " (2+ 학사조직 12학점)" : ""}
            </option>
          ))}
        </select>
      <p className="text-xs text-text-muted">
        학과별 전공 구조와 심화전공 조건은 선택한 학과와 입학년도에 따라 달라집니다.
        복수전공은 인선·기초선택·연구 요건이 완화되고, 자유융합전공은 2개 이상 학사조직의
        전공과목 이수를 함께 확인합니다.
      </p>
    </div>
  );
}
