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
        트랙
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
          </option>
        ))}
      </select>
      <p className="text-xs text-text-muted">트랙 선택은 공통 이수요건 조정에 사용됩니다.</p>
    </div>
  );
}
