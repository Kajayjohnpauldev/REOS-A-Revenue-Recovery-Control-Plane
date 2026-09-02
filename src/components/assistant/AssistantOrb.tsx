"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string; source?: string };

const SUGGESTIONS = [
  "What does this screen do?",
  "How do I connect Gemini?",
  "How is a recovery verified?",
  "What did the agent refuse to do?",
];

/** Baymax's face — two eyes joined by a line, on a soft white body. */
function BaymaxFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="14.5" cy="20" r="2.7" fill="#0b0b0c" />
      <circle cx="25.5" cy="20" r="2.7" fill="#0b0b0c" />
      <path d="M16.8 20 H23.2" stroke="#0b0b0c" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function AssistantOrb() {
  const pathname = usePathname();
  const boundary = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragged = useRef(false);

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [gemini, setGemini] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("revivalos_orb");
      if (s) {
        const p = JSON.parse(s);
        if (typeof p.x === "number") x.set(p.x);
        if (typeof p.y === "number") y.set(p.y);
      }
    } catch {}
  }, [x, y]);

  const refreshStatus = () =>
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => setGemini(!!d.gemini))
      .catch(() => setGemini(false));

  useEffect(() => {
    refreshStatus();
    const onUpdate = () => refreshStatus();
    window.addEventListener("reos-gemini-updated", onUpdate);
    return () => window.removeEventListener("reos-gemini-updated", onUpdate);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, page: pathname }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.answer ?? "…", source: data.source }]);
      if (data.source === "gemini" && !gemini) setGemini(true);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "I couldn't reach the assistant just now." }]);
    } finally {
      setLoading(false);
    }
  };

  const status =
    gemini === null ? "waking up…" : gemini ? "Connected to Gemini" : "Offline · connect Gemini in Settings";

  return (
    <div ref={boundary} className="pointer-events-none fixed inset-0 z-50">
      <motion.div
        drag
        dragMomentum={false}
        style={{ x, y }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={() => {
          const size = 60;
          const margin = 8;
          const minX = margin - (window.innerWidth - 24 - size);
          const maxX = 24 - margin;
          const minY = margin - (window.innerHeight - 24 - size);
          const maxY = 24 - margin;
          const nx = Math.max(minX, Math.min(maxX, x.get()));
          const ny = Math.max(minY, Math.min(maxY, y.get()));
          x.set(nx);
          y.set(ny);
          try {
            localStorage.setItem("revivalos_orb", JSON.stringify({ x: nx, y: ny }));
          } catch {}
          setTimeout(() => (dragged.current = false), 60);
        }}
        className="pointer-events-auto absolute bottom-6 right-6"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="absolute bottom-[4.75rem] right-0 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-3xl border bg-popover shadow-2xl backdrop-blur"
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b bg-gradient-to-b from-muted/60 to-card px-4 py-3.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10">
                  <BaymaxFace className="size-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">Baymax</p>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        gemini ? "bg-money-recovered" : "bg-muted-foreground/50",
                      )}
                    />
                    {status}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3.5">
                {msgs.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Hello, I&apos;m <span className="font-medium text-foreground">Baymax</span> —
                      your personal recovery companion. How can I help?
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="rounded-xl border bg-card px-3 py-2 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[86%] rounded-2xl px-3 py-2 text-sm reos-rise",
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Baymax is thinking…
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 border-t p-2.5"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Baymax…"
                  className="h-9 flex-1 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Baymax orb */}
        <button
          onClick={() => {
            if (dragged.current) return;
            setOpen((o) => !o);
          }}
          className={cn(
            "group relative flex size-15 cursor-grab items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95 active:cursor-grabbing",
            !open && "reos-float",
          )}
          style={{ width: 60, height: 60 }}
          aria-label="Baymax — ask for help"
        >
          <span className="absolute -inset-1 rounded-full bg-accent-blue/25 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
          {open ? (
            <X className="size-6 text-foreground/70" />
          ) : (
            <BaymaxFace className="size-9" />
          )}
        </button>
      </motion.div>
    </div>
  );
}
