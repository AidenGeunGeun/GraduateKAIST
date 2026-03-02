interface AdSlotProps {
  slot: "between" | "sidebar";
}

const SLOT_STYLE = {
  between: {
    container: "w-full",
    frame: "mx-auto h-[100px] w-full max-w-[728px] sm:h-[90px]",
  },
  sidebar: {
    container: "w-full",
    frame: "mx-auto h-[250px] w-[300px] max-w-full",
  },
} as const;

export function AdSlot({ slot }: AdSlotProps) {
  const style = SLOT_STYLE[slot];

  return (
    <section className={style.container} aria-label="광고 영역">
      <div
        className={`${style.frame} flex items-center justify-center rounded-lg border border-dashed border-border bg-surface-soft text-xs text-text-muted`}
      >
        광고 영역
      </div>
      <div
        className="hidden"
        data-ad-client=""
        data-ad-slot=""
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
