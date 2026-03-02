export function PrivacyBadge() {
  return (
    <div className="rounded-lg border border-success/40 bg-success/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <svg
          className="h-4 w-4 shrink-0 text-success"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
        <span className="text-sm font-semibold text-success">
          Zero Data Retention
        </span>
      </div>
      <ul className="space-y-1 text-xs text-success/90">
        <li className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            &bull;
          </span>
          <span>
            성적 데이터는 <strong>브라우저에서만</strong> 처리됩니다
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            &bull;
          </span>
          <span>
            서버 전송, 저장, 수집 <strong>일절 없음</strong>
          </span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            &bull;
          </span>
          <span>
            새로고침 시 모든 데이터가 <strong>즉시 삭제</strong>됩니다
          </span>
        </li>
      </ul>
    </div>
  );
}
