import { cn } from "@/lib/utils";

/**
 * ReOS monogram — a refined graphite tile (adapts to theme). Luxurious,
 * minimal, no pictorial motif. "Re" for Revival; the wordmark reads ReOS.
 */
export function LogoMark({
  className,
  textClassName = "text-[13px]",
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid aspect-square shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-foreground to-foreground/75 text-background shadow-sm ring-1 ring-black/10 dark:ring-white/15",
        className,
      )}
      aria-hidden="true"
    >
      <span className={cn("font-semibold leading-none tracking-tight", textClassName)}>
        Re
      </span>
      <span className="pointer-events-none absolute inset-x-1.5 top-1 h-1/3 rounded-t-[6px] bg-white/10" />
    </span>
  );
}

export function Logo({
  className,
  showSubtitle = false,
  markClassName = "size-8",
  markTextClassName,
}: {
  className?: string;
  showSubtitle?: boolean;
  markClassName?: string;
  markTextClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} textClassName={markTextClassName} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">
          Re<span className="text-muted-foreground">OS</span>
        </span>
        {showSubtitle && (
          <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Revival Operating System
          </span>
        )}
      </span>
    </span>
  );
}
