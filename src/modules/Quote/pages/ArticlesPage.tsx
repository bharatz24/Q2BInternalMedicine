// Articles / resource page (MedMalGuard "Claude1" design).
//
// Reached from the "Articles" link in the desktop nav (see NavBar in
// MedMalGuardLanding.jsx). It reuses the landing's MedMalGuard header so the
// chrome is identical, wraps itself in `.mmg-landing` so it escapes the
// Shell phone-frame at every width (same CSS escape the landing uses), and
// draws its sections with the kit palette + `.mmg-section` rhythm.
//
// This is editorial/marketing content only — no quote wiring lives here.

import { useNavigate } from "react-router-dom";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";
import { FileText, ArrowRight, Calendar } from "@/shared/components/desktop/HubIcons";

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
  border: "#e3e6f0",
  borderSoft: "#eef0f5",
};
const FONT = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";

const ARTICLES = [
  {
    tag: "Coverage basics",
    date: "June 2026",
    title: "Claims-made coverage for NPs, CRNAs, RNs and LPNs",
    excerpt:
      "How nursing malpractice coverage works across the four designations this portal writes, and why your speciality — not just your license — sets the price.",
    read: "5 min read",
  },
  {
    tag: "Buying guide",
    date: "May 2026",
    title: "How nursing malpractice pricing works by speciality",
    excerpt:
      "Premium, tax, and fees — and why a multi-speciality nurse rates on their highest-rated selection.",
    read: "6 min read",
  },
  {
    tag: "Practice type",
    date: "May 2026",
    title: "Choosing the right nursing speciality on your application",
    excerpt:
      "Your designation and speciality selections drive both your appetite eligibility and your premium. Here's how to pick correctly the first time.",
    read: "4 min read",
  },
  {
    tag: "Underwriting",
    date: "April 2026",
    title: "The claims and background questions, explained",
    excerpt:
      "What each Yes/No question in §VI–§VIII is asking, when an explanation is required, and why Missouri applicants skip one question.",
    read: "7 min read",
  },
  {
    tag: "Coverage terms",
    date: "April 2026",
    title: "Choosing a limit of liability: five options explained",
    excerpt:
      "From $100K/$300K to $1M/$3M — how each limit prices, and what changes if your appetite is CRNA-specific.",
    read: "5 min read",
  },
  {
    tag: "Getting started",
    date: "March 2026",
    title: "From practice details to certificate in one session",
    excerpt:
      "A behind-the-scenes look at how a straightforward nursing submission becomes a bound policy and certificate in minutes.",
    read: "3 min read",
  },
];

interface Article {
  tag: string;
  date: string;
  title: string;
  excerpt: string;
  read: string;
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <article
      className="mmg-article-card"
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        background: C.bg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow .15s ease-in-out, transform .15s ease-in-out",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(42,43,69,.10)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Cover band — kit tint with a document glyph; no external images */}
      <div
        style={{
          background: C.accentTint,
          height: 132,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FileText size={40} color={C.accentStrong} />
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: C.accentStrong,
              background: C.accentTint,
              padding: "5px 9px",
              borderRadius: 20,
            }}
          >
            {article.tag}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: C.muted,
              fontWeight: 500,
            }}
          >
            <Calendar size={13} color={C.muted} />
            {article.date}
          </span>
        </div>
        <h3
          style={{
            fontWeight: 800,
            fontSize: 18,
            lineHeight: 1.3,
            color: C.ink,
            margin: "0 0 10px",
          }}
        >
          {article.title}
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: C.body, margin: 0, flex: 1 }}>
          {article.excerpt}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
          }}
        >
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{article.read}</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
              color: C.accentStrong,
            }}
          >
            Read article <ArrowRight size={15} color={C.accentStrong} />
          </span>
        </div>
      </div>
    </article>
  );
}

export default function ArticlesPage() {
  const navigate = useNavigate();
  return (
    <div className="mmg-landing" style={{ fontFamily: FONT, color: C.body, background: C.bg }}>
      <MedMalGuardHeader />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mmg-section" style={{ paddingBottom: 0 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            display: "block",
            background: "none",
            border: 0,
            padding: 0,
            font: "inherit",
            fontWeight: 600,
            fontSize: 13,
            color: C.accentStrong,
            cursor: "pointer",
            marginBottom: 22,
          }}
        >
          ← Back to home
        </button>
        <span
          style={{
            display: "block",
            fontWeight: 700,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            color: C.muted,
          }}
        >
          Resources
        </span>
        <h1
          style={{
            fontWeight: 800,
            fontSize: 42,
            letterSpacing: "-.02em",
            lineHeight: 1.1,
            color: C.ink,
            margin: "12px 0 14px",
          }}
        >
          Articles &amp; guides for nurses
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: C.body, maxWidth: 620, margin: 0 }}>
          Plain-language explainers on nursing malpractice coverage, speciality-based pricing, and
          getting a certificate the same session you apply.
        </p>
      </div>

      {/* ── Article grid ────────────────────────────────────────────────── */}
      <div className="mmg-section">
        <div className="mmg-articles-grid">
          {ARTICLES.map((a) => (
            <ArticleCard key={a.title} article={a} />
          ))}
        </div>
      </div>

      {/* ── CTA band ────────────────────────────────────────────────────── */}
      <div className="mmg-section" style={{ paddingTop: 0 }}>
        <div
          style={{
            background: C.bgSubtle,
            border: `1px solid ${C.borderSoft}`,
            borderRadius: 16,
            padding: "36px 32px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "-.01em",
              color: C.ink,
              margin: "0 0 10px",
            }}
          >
            Ready to see your price?
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: C.body,
              margin: "0 auto 22px",
              maxWidth: 460,
            }}
          >
            Get a real, carrier-backed estimate in minutes — then bind your coverage online.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: C.accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              fontFamily: "inherit",
              padding: "14px 24px",
              borderRadius: 10,
              border: 0,
              cursor: "pointer",
              transition: "background .15s ease-in-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.accentStrong;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.accent;
            }}
          >
            Get my estimate <ArrowRight size={17} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}
