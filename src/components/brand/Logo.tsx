import { cn } from "@/lib/utils";

/**
 * RevivalOS mark — a rounded gradient badge with a "revival pulse": a signal
 * that dips (revenue at risk) and spikes back up (recovered).
 */
export function LogoMark({
  className,
  gradientId = "revival-grad",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b6fe0" />
          <stop offset="55%" stopColor="#1e50c8" />
          <stop offset="100%" stopColor="#0b3d91" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path
        d="M5 19 L11 19 L13.5 12 L16.5 23 L19 15.5 L21 19 L27 19"
        fill="none"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-8 shrink-0 drop-shadow-sm", markClassName)} />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          Revival<span className="text-primary">OS</span>
        </span>
      )}
    </span>
  );
}
