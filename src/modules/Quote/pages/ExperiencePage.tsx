// "Internal Medicine" scroll-film experience page (route: /experience).
//
// An Apple-style scroll-driven brand page for the MedMalGuard / DPL RRG
// Internal Medicine portal, told in two pinned film acts with the brand page
// woven between and after them:
//
//   ACT ONE  — `src/Physician_and_medical_organs.mp4`     → public/film/
//              the specialty and the exposure it carries.
//   ACT TWO  — `src/Physician_reviewing_insurance.mp4`    → public/film2/
//              the transaction: rate, application, certificate, cover in force.
//
// Each act is a frame sequence scrubbed by scroll position on a pinned
// <canvas> (the technique behind Apple's AirPods pages). Frames were sliced
// at 24fps / 1400px wide and encoded to WebP:
//   ffmpeg -i <src>.mp4 -vf "fps=24,scale=1400:-2" f_%04d.png
//   Pillow → WEBP quality 88, method 5
// Act one is 192 frames (~12 MB), act two 240 frames (~15 MB).
//
// The two acts never tell the same story: act one is about internal medicine
// and its liability, act two is about buying the policy. The static
// "how it works" section this page used to carry was deleted when act two
// arrived, because act two now tells it.
//
// Wiring: this page invents NO routes and NO API contracts. Every CTA does
// exactly what `MedMalGuardHeader`'s "Get a quote" does — `practiceStore.clear()`
// then `navigate("/")` — handing the visitor to the real landing calculator,
// which auto-selects the single designation (Internal Medicine → SP_14) and
// prices against `POST /auth/quotedata`. See CLAUDE.md and MedMalGuardLanding.
//
// Chrome: the page wraps itself in `.mmg-landing` so it escapes the Shell
// phone-frame at every width (same CSS escape the landing and ArticlesPage
// use), and reuses `MedMalGuardHeader` — pinned in a fixed overlay that hides
// itself whenever EITHER film is holding the viewport, so nothing covers a
// picture.
//
// Accessibility: each canvas is `role="img"` with a describing label, every
// chapter caption is real DOM text (not painted pixels), and
// `prefers-reduced-motion` collapses both films to a still with the chapter
// copy stacked beneath — no pinning, no scrubbing.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";
import practiceStore from "@/modules/Quote/store/practiceStore";
import {
  ArrowRight,
  Award,
  Check,
  FileText,
  Lock,
  Mail,
  Phone,
  Shield,
  Users,
  Zap,
} from "@/shared/components/desktop/HubIcons";

// ── Kit tokens (mirror of MedMalGuardLanding's palette) ──────────────────
const C = {
  accent: "#6286ed",
  accentStrong: "#2653d4",
  accentTint: "#eff3fd",
  ink: "#2a2c45",
  inkSoft: "#3a3b50",
  body: "#6e7080",
  muted: "#9598a8",
  bg: "#ffffff",
  bgSubtle: "#f8f9fc",
  dark: "#2a2c45",
  onDarkMuted: "#aab0c8",
  border: "#e3e6f0",
  borderSoft: "#eef0f5",
  success: "#1cc88a",
};
const FONT = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

const PHONE = "(888) 966-3881";
const PHONE_HREF = "tel:+18889663881";
const SUPPORT_EMAIL = "support@medmalguard.com";

const BASE = import.meta.env.BASE_URL || "/";
const frameSrc = (dir: string, n: number) => `${BASE}${dir}/f_${String(n).padStart(4, "0")}.webp`;

// ── Chapters ─────────────────────────────────────────────────────────────
// Windows are fractions of each film's progress, landed inside a steady beat
// and cleared before the next cut (the film's own crossfade masks the swap).
// An opening caption uses a negative `in` — a caption with in === 0 is
// invisible at exactly scroll 0.
type Chapter = {
  id: string;
  in: number;
  out: number;
  eyebrow: string;
  title: ReactNode;
  body: string;
  cta?: boolean;
  // Some beats paint their own words across the frame (act one resolves on a
  // giant "INTERNAL MEDICINE"; act two closes under "SECURE · PRIVATE ·
  // TRUSTED"). `align: "top"` lifts the caption clear of them and `compact`
  // drops it a size, so the film's own type stays the biggest thing on screen.
  align?: "top";
  compact?: boolean;
  /** Let a longer headline keep the display size instead of wrapping to four
      lines against the default 13ch measure. */
  wide?: boolean;
};

type Film = {
  id: string;
  dir: string;
  count: number;
  scrollVh: number;
  label: string;
  stillFrame: number;
  chapters: Chapter[];
};

// ACT ONE — cuts at 0.26 (physician → heart), 0.52 (organs → shield),
// 0.75 (shield → title resolve).
const ACT_ONE: Film = {
  id: "act-one",
  dir: "film",
  count: 192,
  scrollVh: 520,
  stillFrame: 170,
  label:
    "An internal medicine physician in a hospital atrium; holographic heart and brain orbit him, the body's organ systems resolve in front of him, and a shield of hexagonal plates closes around him.",
  chapters: [
    {
      id: "open",
      in: -0.03,
      out: 0.15,
      eyebrow: "DPL RRG · Internal Medicine",
      title: (
        <>
          Medicine for the
          <br />
          whole patient.
        </>
      ),
      body: "Malpractice cover written for internists — quoted, signed and bound in one session, without a broker in the middle.",
    },
    {
      id: "whole",
      in: 0.17,
      out: 0.25,
      eyebrow: "The specialty",
      title: <>You are never treating one organ.</>,
      body: "Diagnosis, chronic disease, medication management, referral. An internist holds the thread nobody else is holding.",
    },
    {
      id: "system",
      in: 0.33,
      out: 0.5,
      eyebrow: "The exposure",
      title: (
        <>
          So you carry the
          <br />
          whole system.
        </>
      ),
      body: "Failure to diagnose. Delayed referral. A drug interaction two specialists never compared. Internal medicine risk is cumulative, and it is yours.",
    },
    {
      id: "shield",
      in: 0.57,
      out: 0.72,
      eyebrow: "The coverage",
      title: <>Your policy should carry it with you.</>,
      body: "Claims-made cover from DPL RRG, with your retroactive date, your limits and a defense that starts the day the notice lands.",
    },
    {
      id: "resolve",
      in: 0.8,
      out: 1.02,
      eyebrow: "MedMalGuard",
      title: <>Covered end to end.</>,
      body: "Everything above, in a policy you can hold by this afternoon.",
      align: "top",
      compact: true,
    },
  ],
};

// ACT TWO — cuts at 0.19 (physician → rate panel), 0.31 (panel → tablet),
// 0.50 (lock → certificate), 0.69 (certificate → protective dome).
const ACT_TWO: Film = {
  id: "act-two",
  dir: "film2",
  count: 240,
  scrollVh: 600,
  stillFrame: 210,
  label:
    "A physician in a bright clinic; organ holograms give way to a rate panel, she signs on a tablet behind a padlock, an insurance certificate is issued, and a clear protective dome closes around her under the words secure, private, trusted.",
  chapters: [
    {
      id: "wait",
      in: -0.03,
      out: 0.16,
      eyebrow: "Buying the policy",
      title: (
        <>
          The part that usually
          <br />
          takes three weeks.
        </>
      ),
      body: "Most physicians meet their malpractice policy through someone else's calendar. This one opens on a screen, at whatever hour you actually have free.",
      wide: true,
    },
    {
      id: "rate",
      in: 0.205,
      out: 0.3,
      eyebrow: "The rate",
      title: <>Nothing behind the curtain.</>,
      body: "What you are watching is the carrier's own rating for your state — not a teaser range, and not a number that changes once someone calls you back.",
    },
    {
      id: "apply",
      in: 0.345,
      out: 0.485,
      eyebrow: "The application",
      title: <>Answered once, signed where you sit.</>,
      body: "Scope of practice, prior cover, claims history, underwriting — one pass through, then your signature goes onto the completed application without printing a page.",
    },
    {
      id: "certificate",
      in: 0.525,
      out: 0.675,
      eyebrow: "The certificate",
      title: <>Proof, before you close the tab.</>,
      body: "Payment clears and the binder and invoice are issued to you on the spot. Nobody has to send it over in the morning.",
    },
    {
      id: "holds",
      in: 0.74,
      out: 1.02,
      eyebrow: "And then",
      title: <>It holds.</>,
      body: "Cover in force, documents in your account, renewal on the same rails. The policy stops being a project and goes back to being a policy.",
      cta: true,
      compact: true,
    },
  ],
};

// ── Small helpers ────────────────────────────────────────────────────────
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ease a caption in over its first 18% and out over its last 22%. */
function captionOpacity(p: number, ch: Chapter): number {
  if (p < ch.in || p > ch.out) return 0;
  const span = ch.out - ch.in;
  const t = (p - ch.in) / span;
  const fadeIn = clamp01(t / 0.18);
  const fadeOut = clamp01((1 - t) / 0.22);
  return Math.min(fadeIn, fadeOut);
}

/** Reveal-on-scroll for the brand sections between and after the films. */
function useReveal<T extends HTMLElement>(): [React.MutableRefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

// ── Frame loader ─────────────────────────────────────────────────────────
// Two waves per film: a coarse pass (every 8th frame) so that ANY scroll
// position has something to draw within the first second, then the gap-fill.
// `nearest` walks outward from the requested index to the closest decoded
// frame, so a fast scroll during loading degrades to a slightly steppier film
// instead of a blank canvas.
//
// Act two only starts loading once the visitor is within a couple of
// viewports of it — otherwise a cold open would pull 27 MB before the first
// caption has faded in.
type FilmStore = {
  images: (HTMLImageElement | null)[];
  ready: boolean[];
};

function useFilmFrames(film: Film, enabled: boolean) {
  const store = useRef<FilmStore>({
    images: new Array(film.count).fill(null),
    ready: new Array(film.count).fill(false),
  });
  const [loadedCount, setLoadedCount] = useState(0);
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let done = 0;

    const order: number[] = [];
    for (let i = 0; i < film.count; i += 8) order.push(i);
    for (let i = 0; i < film.count; i += 1) if (i % 8 !== 0) order.push(i);

    const s = store.current;
    const bump = () => {
      done += 1;
      setLoadedCount(done);
      // The coarse pass is count/8 frames; once it lands the film is
      // scrubbable end to end and we release the loading gate.
      if (done >= Math.ceil(film.count / 8)) setPrimed(true);
    };
    const load = (idx: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled) {
            s.images[idx] = img;
            s.ready[idx] = true;
            bump();
          }
          resolve();
        };
        // A missing frame must not wedge the queue — skip and carry on.
        img.onerror = () => {
          if (!cancelled) bump();
          resolve();
        };
        img.src = frameSrc(film.dir, idx + 1);
      });

    // Six at a time: enough to saturate a broadband connection without
    // starving the main thread of decode slots.
    const CONCURRENCY = 6;
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (!cancelled && cursor < order.length) {
        const idx = order[cursor];
        cursor += 1;
        await load(idx);
      }
    };
    void Promise.all(Array.from({ length: CONCURRENCY }, worker));

    return () => {
      cancelled = true;
    };
  }, [enabled, film.count, film.dir]);

  const nearest = useCallback(
    (idx: number): HTMLImageElement | null => {
      const s = store.current;
      if (s.ready[idx]) return s.images[idx];
      for (let d = 1; d < film.count; d += 1) {
        const lo = idx - d;
        const hi = idx + d;
        if (lo >= 0 && s.ready[lo]) return s.images[lo];
        if (hi < film.count && s.ready[hi]) return s.images[hi];
      }
      return null;
    },
    [film.count],
  );

  return { nearest, loadedCount, primed };
}

// ── A film stage ─────────────────────────────────────────────────────────
function FilmStage({
  film,
  sectionRef,
  onQuote,
  eager,
}: {
  film: Film;
  sectionRef: MutableRefObject<HTMLDivElement | null>;
  onQuote: () => void;
  /** Act one loads immediately; act two waits until it is nearly on screen. */
  eager?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const washRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const lastDrawn = useRef(-1);
  const [progress, setProgress] = useState(0);
  const [inRange, setInRange] = useState(Boolean(eager));

  const { nearest, loadedCount, primed } = useFilmFrames(film, inRange);

  // Paint one frame: a cheap blurred wash (the frame downscaled to 32×18 and
  // stretched back up) fills the letterbox, then the sharp contained frame
  // sits on top. Contain-fit, never cover-crop — both films paint their own
  // full-width type and a crop would decapitate it.
  const draw = useCallback(
    (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const idx = Math.min(film.count - 1, Math.max(0, Math.round(p * (film.count - 1))));
      const img = nearest(idx);
      if (!img) return;
      if (idx === lastDrawn.current && canvas.dataset.sized === "1") return;
      lastDrawn.current = idx;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      canvas.dataset.sized = "1";

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Wash.
      let wash = washRef.current;
      if (!wash) {
        wash = document.createElement("canvas");
        wash.width = 32;
        wash.height = 18;
        washRef.current = wash;
      }
      const wctx = wash.getContext("2d");
      if (wctx) {
        wctx.drawImage(img, 0, 0, 32, 18);
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 1;
        ctx.drawImage(wash, 0, 0, 32, 18, -w * 0.06, -h * 0.06, w * 1.12, h * 1.12);
      }

      // Sharp contained frame.
      const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    },
    [nearest, film.count],
  );

  // Scroll → progress, coalesced into one rAF per frame.
  useEffect(() => {
    const tick = () => {
      rafRef.current = null;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Start fetching two viewports out so the stage is primed on arrival.
      if (rect.top < vh * 2 && rect.bottom > -vh) setInRange(true);
      const travel = el.offsetHeight - vh;
      const p = travel <= 0 ? 0 : clamp01(-rect.top / travel);
      progressRef.current = p;
      setProgress(p);
      draw(p);
    };
    const request = () => {
      if (rafRef.current == null) rafRef.current = window.requestAnimationFrame(tick);
    };
    const onResize = () => {
      lastDrawn.current = -1;
      request();
    };
    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [draw, sectionRef]);

  // Repaint as frames arrive, even when the visitor is sitting still.
  useEffect(() => {
    lastDrawn.current = -1;
    draw(progressRef.current);
  }, [loadedCount, draw]);

  const pct = Math.round((loadedCount / film.count) * 100);

  return (
    <div
      ref={sectionRef}
      data-film={film.id}
      style={{ height: `${film.scrollVh}vh`, position: "relative" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#b9cddb",
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={film.label}
          style={{ display: "block", width: "100%", height: "100%" }}
        />

        {/* Legibility scrim under the caption column — both films are bright,
            so captions sit on a soft white wash rather than a dark overlay. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.86) 26%, rgba(255,255,255,.55) 44%, rgba(255,255,255,0) 68%)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxShadow: "inset 0 0 180px 40px rgba(42,44,69,.10)",
          }}
        />

        {/* Chapter captions */}
        <div className="film-captions">
          {film.chapters.map((ch) => {
            const o = captionOpacity(progress, ch);
            return (
              <div
                key={ch.id}
                aria-hidden={o < 0.05}
                className={ch.align === "top" ? "film-caption--top" : undefined}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: ch.align === "top" ? "flex-start" : "center",
                  opacity: o,
                  transform: `translateY(${(1 - o) * 14}px)`,
                  transition: "opacity .12s linear",
                  pointerEvents: o > 0.6 ? "auto" : "none",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    color: C.accentStrong,
                    marginBottom: 16,
                  }}
                >
                  {ch.eyebrow}
                </span>
                <h2
                  className={`film-title${ch.compact ? " film-title--compact" : ""}${
                    ch.wide ? " film-title--wide" : ""
                  }`}
                  style={{ color: C.ink }}
                >
                  {ch.title}
                </h2>
                <p className="film-body" style={{ color: C.inkSoft }}>
                  {ch.body}
                </p>
                {ch.cta ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                      marginTop: 26,
                    }}
                  >
                    <PrimaryButton onClick={onQuote} large>
                      Get my estimate <ArrowRight size={18} color="#fff" />
                    </PrimaryButton>
                    <a
                      href={PHONE_HREF}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 15,
                        color: C.ink,
                        textDecoration: "none",
                        padding: "15px 18px",
                        borderRadius: 10,
                        border: `1px solid ${C.border}`,
                        background: "rgba(255,255,255,.75)",
                      }}
                    >
                      <Phone size={16} color={C.ink} /> {PHONE}
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Chapter rail */}
        <div className="film-rail" aria-hidden="true">
          {film.chapters.map((ch) => {
            const active = progress >= ch.in && progress <= ch.out;
            return (
              <span
                key={ch.id}
                style={{
                  display: "block",
                  width: active ? 26 : 12,
                  height: 3,
                  borderRadius: 2,
                  background: active ? C.accentStrong : "rgba(42,44,69,.28)",
                  transition: "width .25s ease, background .25s ease",
                }}
              />
            );
          })}
        </div>

        {/* Scroll hint, only on act one's opening frames */}
        {eager ? (
          <div
            aria-hidden="true"
            className="film-hint"
            style={{ opacity: progress < 0.03 ? 1 : 0, color: C.inkSoft }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              Scroll
            </span>
            <span className="film-hint__line" />
          </div>
        ) : null}

        {/* Loading gate */}
        {!primed ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              background: "rgba(248,249,252,.94)",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13, color: C.ink, letterSpacing: ".04em" }}>
              Loading… {pct}%
            </span>
            <span
              style={{
                display: "block",
                width: 180,
                height: 3,
                borderRadius: 2,
                background: C.border,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${pct}%`,
                  height: "100%",
                  background: C.accent,
                  transition: "width .2s linear",
                }}
              />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Reduced-motion fallback: one still per act, and the chapter copy as plain
// stacked sections.
function FilmStill({ film, onQuote }: { film: Film; onQuote: () => void }) {
  return (
    <div style={{ background: C.bgSubtle }}>
      <div className="mmg-section">
        <img
          src={frameSrc(film.dir, film.stillFrame)}
          alt={film.label}
          style={{ width: "100%", borderRadius: 16, display: "block" }}
        />
        {film.chapters.map((ch) => (
          <div key={ch.id} style={{ maxWidth: 680, margin: "44px 0 0" }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                color: C.accentStrong,
              }}
            >
              {ch.eyebrow}
            </span>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 34,
                lineHeight: 1.12,
                letterSpacing: "-.02em",
                color: C.ink,
                margin: "10px 0 12px",
              }}
            >
              {ch.title}
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: C.body, margin: 0 }}>{ch.body}</p>
            {ch.cta ? (
              <div style={{ marginTop: 22 }}>
                <PrimaryButton onClick={onQuote} large>
                  Get my estimate <ArrowRight size={18} color="#fff" />
                </PrimaryButton>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────
function PrimaryButton({
  onClick,
  children,
  large,
}: {
  onClick: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        background: C.accent,
        color: "#fff",
        fontWeight: 700,
        fontSize: large ? 16 : 15,
        fontFamily: "inherit",
        padding: large ? "16px 28px" : "14px 24px",
        borderRadius: 10,
        border: 0,
        cursor: "pointer",
        boxShadow: "0 8px 22px rgba(98,134,237,.28)",
        transition: "background .15s ease-in-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = C.accentStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = C.accent;
      }}
    >
      {children}
    </button>
  );
}

function Section({
  children,
  tone = "light",
  style,
}: {
  children: ReactNode;
  tone?: "light" | "subtle" | "dark";
  style?: CSSProperties;
}) {
  const [ref, shown] = useReveal<HTMLElement>();
  const bg = tone === "dark" ? C.dark : tone === "subtle" ? C.bgSubtle : C.bg;
  return (
    <section
      ref={ref}
      style={{
        background: bg,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(22px)",
        transition: "opacity .6s ease, transform .6s ease",
        ...style,
      }}
    >
      <div className="mmg-section">{children}</div>
    </section>
  );
}

function Eyebrow({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      style={{
        display: "block",
        fontWeight: 700,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: ".09em",
        color: onDark ? C.onDarkMuted : C.muted,
        marginBottom: 14,
      }}
    >
      {children}
    </span>
  );
}

function H2({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <h2
      className="exp-h2"
      style={{
        color: onDark ? "#fff" : C.ink,
        fontWeight: 800,
        letterSpacing: "-.022em",
        lineHeight: 1.1,
        margin: "0 0 16px",
      }}
    >
      {children}
    </h2>
  );
}

// ── The brand page woven around the films ────────────────────────────────
const STATS = [
  { value: "20", label: "states written", note: "DPL RRG's active footprint" },
  { value: "A", label: "Demotech FSR", note: "Exceptional financial stability" },
  { value: "SP_14", label: "rating class", note: "Internal Medicine, one designation" },
  { value: "1", label: "session to bind", note: "Quote, sign and pay without a call" },
];

const CARRIES = [
  {
    icon: Shield,
    title: "Claims-made, with your retro date",
    body: "Your retroactive date carries your history forward, so the years you have already practiced are not left outside the policy.",
  },
  {
    icon: Lock,
    title: "Limits you choose at quote time",
    body: "The coverage limits available in your state load with your ZIP, default to the state's standard, and re-price the moment you change them.",
  },
  {
    icon: FileText,
    title: "Defense from the first notice",
    body: "A claim rarely arrives as a claim. It arrives as a letter, a records request, a board inquiry — and the file opens then.",
  },
  {
    icon: Users,
    title: "Written for the whole care team",
    body: "MD and DO physicians, plus the PAs, NPs, CRNAs and CNMs practicing alongside them, all rate on the same internal medicine class.",
  },
];

// Stills cut from both acts — no new generations, just crops of the films.
// Captions describe the COVERAGE in each frame, never the production: nothing
// on this page should read as talk about a film.
const GALLERY = [
  { dir: "film", frame: 84, caption: "The whole-patient exposure an internist carries" },
  { dir: "film2", frame: 140, caption: "The certificate, issued the moment you bind" },
  { dir: "film2", frame: 220, caption: "Cover in force, documents on file" },
];

const COVERS = [
  "MD — Doctor of Medicine",
  "DO — Doctor of Osteopathic Medicine",
  "PA — Physician Assistant",
  "NP — Nurse Practitioner",
  "CRNA — Nurse Anesthetist",
  "CNM — Nurse Midwife",
];

export default function ExperiencePage() {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [navShown, setNavShown] = useState(false);
  const actOneRef = useRef<HTMLDivElement | null>(null);
  const actTwoRef = useRef<HTMLDivElement | null>(null);

  // The real header is pinned in a fixed overlay and stays out of the way
  // whenever a film is holding the viewport, so nothing covers a picture.
  useEffect(() => {
    if (reduced) {
      setNavShown(true);
      return;
    }
    const holdsViewport = (el: HTMLDivElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top <= 64 && r.bottom >= window.innerHeight * 0.75;
    };
    const onScroll = () => {
      setNavShown(!holdsViewport(actOneRef.current) && !holdsViewport(actTwoRef.current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  // Exactly what MedMalGuardHeader's "Get a quote" does: clear the form so
  // the calculator mounts blank, then hand off to the landing on "/". The
  // landing auto-selects the single designation (Internal Medicine → SP_14).
  const onQuote = useCallback(() => {
    practiceStore.clear();
    window.scrollTo(0, 0);
    navigate("/");
  }, [navigate]);

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div
      className="mmg-landing exp-page"
      style={{ fontFamily: FONT, color: C.body, background: C.bg }}
    >
      <style>{EXPERIENCE_CSS}</style>

      {/* Sticky chrome — hidden whenever a film holds the viewport. */}
      <div
        className="exp-nav"
        style={{
          opacity: navShown ? 1 : 0,
          pointerEvents: navShown ? "auto" : "none",
        }}
      >
        <MedMalGuardHeader />
      </div>

      {reduced ? (
        <div style={{ paddingTop: 72 }}>
          <FilmStill film={ACT_ONE} onQuote={onQuote} />
        </div>
      ) : (
        <FilmStage film={ACT_ONE} sectionRef={actOneRef} onQuote={onQuote} eager />
      )}

      {/* ── Manifesto ─────────────────────────────────────────────────── */}
      <Section>
        <div style={{ maxWidth: 780 }}>
          <Eyebrow>The manifesto</Eyebrow>
          <H2>
            Internal medicine is the specialty that refuses to look away from the rest of the chart.
          </H2>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: C.body, margin: "0 0 18px" }}>
            Cardiology sees the heart. Pulmonology sees the lungs. You see the person they both
            belong to — the interactions, the omissions, the symptom that only means something next
            to the other four. That is the value of the specialty, and it is also, precisely, where
            its liability lives.
          </p>
          <p style={{ fontSize: 19, lineHeight: 1.65, color: C.body, margin: 0 }}>
            Malpractice cover for an internist should be bought the way the work is done: with the
            whole picture visible at once.
          </p>
        </div>
      </Section>

      {/* ── Stats band ────────────────────────────────────────────────── */}
      <Section tone="dark" style={{ color: "#fff" }}>
        <div className="exp-stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 40,
                  lineHeight: 1,
                  color: "#fff",
                  letterSpacing: "-.02em",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  color: C.accent,
                  margin: "10px 0 6px",
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.onDarkMuted }}>{s.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── What the policy carries ───────────────────────────────────── */}
      <Section tone="subtle">
        <div style={{ maxWidth: 660, marginBottom: 40 }}>
          <Eyebrow>What the policy carries</Eyebrow>
          <H2>Four things an internist should never have to ask twice about.</H2>
        </div>
        <div className="exp-grid-2">
          {CARRIES.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: "26px 26px 28px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: C.accentTint,
                    marginBottom: 18,
                  }}
                >
                  <Icon size={20} color={C.accentStrong} />
                </span>
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: 17.5,
                    color: C.ink,
                    margin: "0 0 9px",
                    letterSpacing: "-.01em",
                  }}
                >
                  {c.title}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: C.body, margin: 0 }}>{c.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── ACT TWO ───────────────────────────────────────────────────── */}
      {reduced ? (
        <FilmStill film={ACT_TWO} onQuote={onQuote} />
      ) : (
        <FilmStage film={ACT_TWO} sectionRef={actTwoRef} onQuote={onQuote} />
      )}

      {/* ── Who it covers ─────────────────────────────────────────────── */}
      <Section>
        <div className="exp-split">
          <div>
            <Eyebrow>Eligibility</Eyebrow>
            <H2>Who rates on this class.</H2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: C.body, margin: "0 0 8px" }}>
              One designation, one speciality code, one rate table — which is why the estimate comes
              back in seconds instead of going to an underwriter first.
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {COVERS.map((c) => (
              <li
                key={c}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "15px 0",
                  borderBottom: `1px solid ${C.borderSoft}`,
                  fontSize: 15.5,
                  fontWeight: 600,
                  color: C.ink,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: C.accentTint,
                    flex: "0 0 auto",
                  }}
                >
                  <Check size={13} color={C.accentStrong} />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ── Gallery, cut from both acts ───────────────────────────────── */}
      <Section tone="subtle">
        <div style={{ maxWidth: 660, marginBottom: 36 }}>
          <Eyebrow>The cover in practice</Eyebrow>
          <H2>What the policy looks like from where you stand.</H2>
        </div>
        <div className="exp-gallery">
          {GALLERY.map((g) => (
            <figure key={`${g.dir}-${g.frame}`} style={{ margin: 0 }}>
              <span className="img-blend">
                <img src={frameSrc(g.dir, g.frame)} alt={g.caption} loading="lazy" />
              </span>
              <figcaption
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.muted,
                  marginTop: 12,
                  letterSpacing: ".01em",
                }}
              >
                {g.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ── Closing CTA ───────────────────────────────────────────────── */}
      <Section tone="dark">
        <div style={{ maxWidth: 720 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 700,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: C.accent,
              marginBottom: 18,
            }}
          >
            <Zap size={14} color={C.accent} /> Live pricing
          </span>
          <H2 onDark>See your number before you decide anything.</H2>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: C.onDarkMuted,
              margin: "0 0 28px",
              maxWidth: 560,
            }}
          >
            It takes a ZIP and a date to find out. Seeing the figure commits you to nothing.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <PrimaryButton onClick={onQuote} large>
              Get my estimate <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 600,
                fontSize: 15,
                color: "#fff",
                textDecoration: "none",
                padding: "15px 20px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.22)",
              }}
            >
              <Mail size={16} color="#fff" /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </Section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ background: "#232539", color: C.onDarkMuted }}>
        <div className="mmg-section" style={{ paddingTop: 44, paddingBottom: 40 }}>
          <div className="exp-footer">
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 17,
                  letterSpacing: "-.01em",
                  marginBottom: 12,
                }}
              >
                <Award size={19} color={C.accent} /> MedMalGuard
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, maxWidth: 330 }}>
                Internal medicine malpractice coverage from DPL RRG. Quote, sign and bind online.
              </p>
            </div>
            <div>
              <FooterHead>Talk to someone</FooterHead>
              <a className="exp-footer__link" href={PHONE_HREF}>
                {PHONE}
              </a>
              <a className="exp-footer__link" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div>
              <FooterHead>Get going</FooterHead>
              <button type="button" className="exp-footer__link exp-footer__btn" onClick={onQuote}>
                Get an estimate
              </button>
              <button
                type="button"
                className="exp-footer__link exp-footer__btn"
                onClick={() => navigate("/articles")}
              >
                Articles &amp; guides
              </button>
              <button
                type="button"
                className="exp-footer__link exp-footer__btn"
                onClick={() => navigate("/signin")}
              >
                Sign in
              </button>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,.1)",
              marginTop: 34,
              paddingTop: 20,
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            © {year} MedMalGuard. Coverage is written by DPL RRG and is subject to underwriting,
            state availability and the terms of the issued policy. Estimates shown before binding
            are not an offer of insurance.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterHead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: ".09em",
        color: "#fff",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

// ── Page-scoped CSS ──────────────────────────────────────────────────────
// Inline <style> rather than a new stylesheet: everything here is scoped to
// .exp-page / the film stages and only ever mounts on this route, matching how
// the landing keeps its one-off kit rules local.
const EXPERIENCE_CSS = `
.exp-page { --exp-gutter: 40px; }

/* Fixed chrome overlay — the real NavBar is position:sticky, which resolves
   to the top of this fixed parent. */
.exp-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 40;
  transition: opacity .35s ease;
}

/* Caption column: left third on desktop, full width and bottom-anchored on
   phones where a third of the screen is nothing. */
.film-captions { position: absolute; inset: 0; pointer-events: none; }
.film-captions > div { padding: 0 6vw 0 clamp(24px, 7vw, 108px); }
.film-title {
  font-weight: 800;
  font-size: clamp(34px, 5.6vw, 78px);
  line-height: 1.02;
  letter-spacing: -.035em;
  margin: 0 0 18px;
  max-width: 13ch;
}
.film-title--compact {
  font-size: clamp(30px, 3.6vw, 52px);
  letter-spacing: -.03em;
  max-width: 16ch;
}
.film-title--wide { max-width: 19ch; font-size: clamp(32px, 4.8vw, 66px); }
/* A closing beat's caption clears the film's own painted title. */
.film-caption--top { padding-top: clamp(96px, 16vh, 168px) !important; }
.film-body {
  font-size: clamp(15px, 1.25vw, 19px);
  line-height: 1.6;
  margin: 0;
  max-width: 44ch;
  font-weight: 450;
}
.film-rail {
  position: absolute;
  right: clamp(16px, 2.6vw, 38px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.film-hint {
  position: absolute;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: opacity .3s ease;
}
.film-hint__line {
  display: block;
  width: 1px;
  height: 34px;
  background: linear-gradient(180deg, rgba(42,44,69,.55), rgba(42,44,69,0));
}

/* Brand page between and after the films */
.exp-h2 { font-size: clamp(28px, 3.4vw, 44px); }
.exp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 34px; }
.exp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.exp-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.exp-split { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
.exp-footer { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 36px; }
.exp-footer__link {
  display: block;
  color: #aab0c8;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 0;
  background: none;
  border: 0;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.exp-footer__link:hover { color: #fff; }

/* A still on a page sits in a hard rectangle; the radial mask dissolves its
   edges into the surface so the crops read as part of the film, not as
   pasted screenshots. */
.img-blend { display: block; overflow: hidden; border-radius: 14px; }
.img-blend img {
  display: block;
  width: 100%;
  height: auto;
  -webkit-mask-image: radial-gradient(118% 108% at 50% 45%, #000 52%, rgba(0,0,0,.35) 84%, transparent 100%);
  mask-image: radial-gradient(118% 108% at 50% 45%, #000 52%, rgba(0,0,0,.35) 84%, transparent 100%);
}

@media (max-width: 1023px) {
  .exp-stats { grid-template-columns: repeat(2, 1fr); gap: 28px; }
  .exp-split { grid-template-columns: 1fr; gap: 28px; }
  .exp-footer { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 767px) {
  .film-captions > div {
    justify-content: flex-end;
    padding: 0 22px 13vh;
  }
  .film-title { max-width: 16ch; }
  /* On a phone the film sits in a small letterboxed strip and its painted
     title is tiny, so a top-aligned caption goes back to the bottom with the
     others rather than floating at the top of an empty stage. */
  .film-caption--top {
    justify-content: flex-end !important;
    padding-top: 0 !important;
  }
  .film-rail { top: auto; bottom: 26px; right: 22px; transform: none; flex-direction: row; }
  .film-hint { display: none; }
  .exp-grid-2 { grid-template-columns: 1fr; }
  .exp-gallery { grid-template-columns: 1fr; }
  .exp-stats { grid-template-columns: 1fr 1fr; }
  .exp-footer { grid-template-columns: 1fr; gap: 28px; }
}
`;
