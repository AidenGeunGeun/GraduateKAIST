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
              {track === "자유융합전공" ? " (공통 분석만)" : ""}
            </option>
          ))}
        </select>
      <p className="text-xs text-text-muted">복수전공은 공통 인선/연구 완화를 반영하고, 모든 트랙의 학과별 세부 규칙은 공식 소스 정리 전까지 공통 분석만 제공합니다.</p>
    </div>
  );
}
