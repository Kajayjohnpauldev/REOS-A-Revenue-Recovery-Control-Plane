# ReOS — Manus presentation prompt (complete)

Paste everything below into Manus (Slides mode, **Starburst** template selected).

---

**ROLE & GOAL**
You are a senior product-marketing designer. Build a polished, investor-grade **pitch-deck presentation** (a slide deck) for a product called **ReOS — Revival Operating System**, built for the **Razorpay AI Buildathon (Track 03: AI Revenue Recovery)** by **Ajay John Paul**. The audience is hackathon judges and Razorpay product leaders. The deck must feel premium and confident — like a startup pitch, not a lecture.

**VISUAL SYSTEM**
- Style: bold, modern "project pitch deck" (like the **Starburst** template). High-contrast dark title/section dividers; clean light content slides.
- Palette: mostly **black & white / graphite**, with a **restrained accent** (deep blue). Reserve colour for **data** only (green = recovered, amber = at-risk, blue = net/incremental, red = refund/blocked).
- Typography: confident, large headlines; tight, minimal on-slide text (max ~30 words per slide). One big idea per slide. Put the detail in **speaker notes**.
- Every slide: a clear headline, a short supporting line, and a relevant **visual** (icon set, diagram, or simple chart). Add tasteful imagery: finance, dashboards, shields (safety), recovery/growth arrows.
- Length: **12 slides**. 16:9.

**PRODUCT ONE-LINER**
An AI **revenue-recovery control plane** for Razorpay merchants — it detects at-risk revenue, **reconciles it against LIVE state**, takes **ONE** bounded, policy-governed action, and **proves the exact money recovered** (subtracting refunds/disputes back out).

**THESIS**
Given a *verified* revenue-risk event, recover the most money with the least customer friction — and prove exactly what happened, why, and when we chose to stop.

---

**SLIDE-BY-SLIDE**

**1 — Title (dark divider).** "ReOS · Revival Operating System". Tagline: "Recover more revenue. Prove every rupee." Subtitle: "Razorpay AI Buildathon · Track 03 — AI Revenue Recovery · by Ajay John Paul." Visual: a bold monogram / recovery pulse. Speaker note: one-line pitch.

**2 — The problem.** Headline: "Merchants leak revenue everywhere." Four surfaces where Razorpay merchants silently lose money: **payment failures, abandoned checkouts, failed subscriptions, overdue receivables.** Visual: 4 icons in a row. Speaker note: it's fragmented and mostly unworked.

**3 — Why today's tools fall short.** Three failure modes: **blind retries → double charges**; **dunning → dark patterns**; **no proof** of what was actually recovered vs. what would've happened anyway. Visual: three red "X" cards. Speaker note: recovery without reconciliation is dangerous; recovery without measurement is unprovable.

**4 — The solution.** Headline: "A control plane for revenue recovery." ReOS is a **desktop operations console** (not a chatbot): detect → reconcile → act once → prove. Show the thesis line. Visual: a clean console mock / dashboard silhouette.

**5 — How it works (the engine).** A **six-layer** flow, left to right: **Ingestion (dedupe) → Normalize → Reconcile (re-read live state) → Decision (score) → Ledger (append-only) → Audit.** Visual: a horizontal pipeline diagram with 6 nodes. Speaker note: each at-risk event flows through this once.

**6 — The double-charge firewall.** Headline: "We re-read reality before we act." A stale `payment.failed` webhook on an **already-captured** payment becomes a **logged NO-OP** (reason: already_paid). Visual: a small sequence — webhook says "failed" → live check says "captured" → NO-OP, no second charge. Speaker note: this is the core reliability idea.

**7 — Safety is a feature.** Headline: "AI drafts. It never moves money." Money truth is **deterministic** — money changes state only through an **append-only ledger**. A **dark-pattern screen** refuses manipulative copy; **consent** is enforced; every refusal is logged on a **Guardrails** cockpit ("What the agent refused to do"). Visual: shield + a "refused" card. 

**8 — The agents.** Headline: "Seven bounded roles." Three **AI** (Classifier, Communicator, Receivables Reader) + three **deterministic** (Prioritiser, Retry Strategist, Escalation Builder) + an **Orchestrator**. Each has a **fixed tool allowlist** and an **abstention rule**. Visual: a 7-tile grid, AI vs code tagged.

**9 — Proof: Replay & Experiment Studio.** Headline: "Watch it work, then measure it." Streams **six scripted moments**: stale no-op · blocked duplicate · consented cart recovery · retry-budget stop (T+3) · high-value escalation · refund auto-subtract. A **treatment-vs-holdout toggle** computes **INCREMENTAL** recovery. Visual: a run-log list with status pills + a toggle.

**10 — The numbers (demo dataset).** KPI row: **At-risk ₹1.95L · Gross recovered ₹38.7K · Incremental ₹35.7K · Net ₹38.7K.** Also: recovery rate ~38%, audit completeness 100%, ten measured metrics, one-click audit export (JSON + CSV). Visual: a **bar chart — at-risk vs recovered by lane** (Receivables, Payments, Dispute, Checkout, Subscriptions).

**11 — The product.** Headline: "Role-based, and genuinely usable." **Four logins** each with a tailored dashboard: **Admin, Recovery Operator, Finance Analyst, Auditor.** Ten screens. Plus **Baymax**, an in-app AI assistant (Google **Gemini**, with an offline fallback). Visual: a 2×2 role matrix + a small assistant bubble.

**12 — Honest value + vision + CTA (dark divider).** The recovered money is the **merchant's**; Razorpay's benefit — a **stickier platform** via conversion & retention — is a **separate, measured hypothesis**, never conflated. Built on Next.js, **runs fully offline with zero keys**, with a **tested credibility core**. Close: "Thank you." GitHub: **github.com/Kajayjohnpauldev/REOS**.

**DELIVER** a presentation-ready 12-slide deck in the Starburst style, with the charts and diagrams described, tasteful imagery, and concise speaker notes on each slide.
