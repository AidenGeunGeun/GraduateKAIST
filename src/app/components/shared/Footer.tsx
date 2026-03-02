export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 border-t border-border pt-4 text-xs text-text-muted">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <span>KAIST 졸업요건 분석기</span>
        <span className="hidden sm:inline">|</span>
        <span>모든 데이터는 브라우저에서만 처리됩니다</span>
        <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
          공통학사요람만 지원
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <a
          href="https://buymeacoffee.com/kaistgrad"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-text hover:text-accent"
        >
          ☕ 개발자에게 커피 한 잔 사주기
        </a>
        <span className="hidden sm:inline">|</span>
        <a
          href="https://github.com/yourusername/graduatekaist"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text hover:text-accent"
        >
          GitHub
        </a>
        <span className="hidden sm:inline">|</span>
        <span>© {year}</span>
      </div>
    </footer>
  );
}
