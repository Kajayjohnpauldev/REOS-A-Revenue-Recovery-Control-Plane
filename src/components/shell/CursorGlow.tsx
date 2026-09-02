"use client";

import { useEffect, useRef } from "react";

/** A faint radial spotlight that follows the pointer — subtle depth, not gaudy. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          el.style.setProperty("--mx", `${e.clientX}px`);
          el.style.setProperty("--my", `${e.clientY}px`);
        }
        raf = 0;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="reos-cursor-glow pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
