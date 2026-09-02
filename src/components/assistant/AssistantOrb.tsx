"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string; source?: string };

const SUGGESTIONS = [
  "What does this screen do?",
  "How is a recovery verified?",
  "What did the agent refuse to do?",
  "Explain incremental recovery",
];

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
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => setGemini(!!d.gemini))
      .catch(() => setGemini(false));
  }, [x, y]);

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
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "I couldn't reach the assistant just now." }]);
    } finally {
      setLoading(false);
    }
  };

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
          // Keep the orb fully on-screen (base position is bottom-right).
          const size = 56;
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
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="absolute bottom-[4.5rem] right-0 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 bg-gradient-to-r from-primary to-accent-blue px-4 py-3 text-white">
                <LogoMark className="size-7" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">Ask RevivalOS</p>
                  <p className="text-[11px] text-white/80">
                    {gemini === null
                      ? "…"
                      : gemini
                        ? "Powered by Gemini"
                        : "Offline guide · add a Gemini key for more"}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
                {msgs.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Hi 👋 I&apos;m your guide to RevivalOS. Ask me anything, or start with:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
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
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
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
                    <Loader2 className="size-4 animate-spin" /> thinking…
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
                  placeholder="Ask about this app…"
                  className="h-9 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orb */}
        <button
          onClick={() => {
            if (dragged.current) return;
            setOpen((o) => !o);
          }}
          className="group relative flex size-14 cursor-grab items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-blue text-white shadow-xl ring-4 ring-primary/15 transition-transform hover:scale-105 active:scale-95 active:cursor-grabbing"
          aria-label="Ask RevivalOS"
        >
          <span className="absolute inset-0 rounded-full bg-primary/40 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
          {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
        </button>
      </motion.div>
    </div>
  );
}
