import { useState, useRef, useCallback } from "react";
import {
  Upload, CheckCircle2, AlertTriangle, Users, Sparkles, X, ChevronRight,
  FileText, Loader2, TrendingUp, ShieldAlert, HelpCircle, ArrowUpDown,
  RotateCcw, Circle, Download, Link2, Settings2, KeyRound, ChevronDown, Radar,
} from "lucide-react";

// ---------- design tokens ----------
const T = {
  ink: "#12192B", ink2: "#1A2340", ink3: "#232E52",
  paper: "#F6F1E7", paper2: "#EFE8D9",
  textInk: "#1C2333", textPaper: "#F2EEE3",
  mutedDark: "#9AA3B8", mutedPaper: "#7A705E",
  emerald: "#2F8F5B", emeraldSoft: "#DCEEE2",
  amber: "#C6862B", amberSoft: "#F3E7CE",
  rose: "#B4483F", roseSoft: "#F3DFDA",
  indigo: "#4453B8", indigoSoft: "#E1E4F6",
  violet: "#7A4FC9", violetSoft: "#EAE1F7",
  line: "#D9D2C0", lineDark: "#2C3660",
};

const VERDICT_STYLE = {
  Interview: { c: T.emerald, s: T.emeraldSoft, label: "Interview" },
  Maybe: { c: T.amber, s: T.amberSoft, label: "Maybe" },
  Pass: { c: T.rose, s: T.roseSoft, label: "Pass" },
};

const RISK_STYLE = {
  Low: T.emerald, Medium: T.amber, High: T.rose,
};

// ---------- AI provider registry ----------
// Candor can run its recruiter-judgment engine on either Claude or Gemini.
// Anthropic calls are proxied by the host environment and need no key.
// Gemini calls go straight from the browser to Google's API, so they need
// a Gemini API key (get one free at https://aistudio.google.com/apikey).
const PROVIDERS = {
  claude: {
    label: "Claude",
    model: "claude-sonnet-4-6",
    needsKey: false,
    accent: T.indigo,
  },
  gemini: {
    label: "Gemini",
    model: "gemini-2.5-flash",
    needsKey: true,
    accent: T.violet,
  },
};

const SYSTEM_PROMPT = `You are a senior recruiter with 15 years of experience across many industries. Your guiding question is always: "Would a good recruiter interview this person?" — never a keyword scanner. You weigh trajectory, transferable skills, and real-world impact over literal keyword overlap. You are open-minded about non-traditional paths, career gaps, and unconventional formatting.

Rules:
- Only recommend "Pass" for a genuine fundamental mismatch in role, level, or domain — never for a fixable or soft concern. Soft concerns belong in "concerns", framed as things to probe in an interview, not reasons to reject.
- Among "strengths", include at least one genuine strength the job description did not explicitly ask for.
- "achievementScore" rates how much measurable change/impact the candidate actually drove (ownership, initiative, outcomes) versus just listing duties — not how impressive their titles sound.
- "aiRiskLevel" is your honest heuristic judgment of whether the resume text reads as AI-generated or heavily templated (generic buzzwords, no concrete specifics, unnatural uniformity) versus authentic — make clear in aiRiskNote this is a judgment call, not a certainty.
- "questions" must be specific to THIS candidate's actual background and THIS role — never generic interview questions.
- Keep every field concise. Total output must stay well under 700 words.

Respond with ONLY valid JSON (no markdown fences, no preamble, no commentary) matching exactly this schema:
{
  "candidateName": string,
  "currentTitle": string,
  "recommendation": "Interview" | "Maybe" | "Pass",
  "confidence": number (0-100),
  "summary": string (1-2 sentences, specific to this candidate and role),
  "strengths": [ { "title": string, "detail": string } ] (3-5 items),
  "concerns": [ { "title": string, "detail": string } ] (1-4 items),
  "achievementScore": number (0-100),
  "achievementNote": string (1-2 sentences),
  "aiRiskLevel": "Low" | "Medium" | "High",
  "aiRiskNote": string (1 sentence),
  "questions": [string] (4-6 items)
}`;

const COMPARE_SYSTEM_PROMPT = `You are a senior recruiter who has already individually assessed several candidates for the same open role. Now rank them against EACH OTHER for this specific role. Your reasoning must be comparative — explain why one candidate ranks above another, not just restate their individual summary. Be open-minded and holistic, not keyword-driven.

Respond with ONLY valid JSON (no markdown fences, no preamble):
{ "ranking": [ { "id": string, "rank": number, "reason": string (1-2 sentences, comparative) } ] }`;

const JOB_IMPORT_SYSTEM_PROMPT = `You extract job posting details from a URL using web search. Find the job title and the core responsibilities, requirements, and qualifications. Write them in your own words as clean plain text (not JSON, no markdown headers) under 400 words — omit company boilerplate, legal/EEO text, and benefits fluff. Start the first line with the job title only. If you cannot find or access the posting, respond with exactly: FETCH_FAILED`;

function stripFences(text) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Returns true for errors worth showing a "this usually clears up" hint for
// (server overloaded / rate-limited), regardless of which provider threw it.
function isOverloadedMessage(message) {
  return /^(429|500|502|503|529):/.test(message || "") || /overloaded|rate.?limit/i.test(message || "");
}

async function callAnthropic(system, content, onRetry, opts = {}) {
  const { tools, expectJson = true } = opts;
  const maxAttempts = 6;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: PROVIDERS.claude.model,
          max_tokens: 1000,
          system,
          messages: [{ role: "user", content }],
          ...(tools ? { tools } : {}),
        }),
      });
      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errBody = await response.json();
          detail = errBody?.error?.message || errBody?.error?.type || detail;
        } catch (_) { /* body wasn't JSON, keep statusText */ }
        console.error(`Claude API error ${response.status}:`, detail);
        const retryable = response.status === 529 || response.status === 429 || response.status >= 500;
        const err = new Error(`${response.status}: ${detail}`);
        err.retryable = retryable;
        throw err;
      }
      const data = await response.json();
      const textBlocks = (data.content || []).filter((b) => b.type === "text");
      if (!textBlocks.length) throw new Error("The response had no readable content");
      const fullText = textBlocks.map((b) => b.text).join("\n");
      if (!expectJson) return fullText.trim();
      try {
        return JSON.parse(stripFences(fullText));
      } catch (parseErr) {
        console.error("Could not parse model output as JSON:", fullText);
        const err = new Error("Got a response but couldn't read it as structured data");
        err.retryable = true;
        throw err;
      }
    } catch (e) {
      lastError = e;
      console.error(`callAnthropic attempt ${attempt}/${maxAttempts} failed:`, e);
      const retryable = e.retryable !== false && attempt < maxAttempts;
      if (!retryable) break;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 16000); // 1s, 2s, 4s, 8s, 16s, 16s
      onRetry?.(attempt, maxAttempts, delay, e.message);
      await sleep(delay);
    }
  }
  throw lastError;
}

// Converts our Claude-shaped content blocks ({type:"text"}, {type:"document"})
// into Gemini's `parts` shape ({text}, {inline_data}).
function toGeminiParts(content) {
  return content.map((block) => {
    if (block.type === "text") return { text: block.text };
    if (block.type === "document" && block.source?.type === "base64") {
      return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
    }
    throw new Error(`Unsupported content block for Gemini: ${block.type}`);
  });
}

async function callGemini(apiKey, system, content, onRetry, opts = {}) {
  const { tools, expectJson = true } = opts;
  if (!apiKey) {
    const err = new Error("Add a Gemini API key in AI settings to use Gemini.");
    err.retryable = false;
    throw err;
  }
  const maxAttempts = 6;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDERS.gemini.model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: toGeminiParts(content) }],
            generationConfig: {
              maxOutputTokens: 2048,
              ...(expectJson && !tools ? { responseMimeType: "application/json" } : {}),
            },
            // Claude's web_search tool maps to Gemini's built-in Google Search grounding.
            ...(tools ? { tools: [{ google_search: {} }] } : {}),
          }),
        }
      );
      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errBody = await response.json();
          detail = errBody?.error?.message || detail;
        } catch (_) { /* body wasn't JSON, keep statusText */ }
        console.error(`Gemini API error ${response.status}:`, detail);
        const retryable = response.status === 429 || response.status >= 500;
        const err = new Error(`${response.status}: ${detail}`);
        err.retryable = retryable;
        throw err;
      }
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        throw new Error(`Gemini declined to respond (${finishReason.toLowerCase()})`);
      }
      const fullText = (candidate?.content?.parts || []).map((p) => p.text || "").join("\n");
      if (!fullText.trim()) throw new Error("The response had no readable content");
      if (!expectJson) return fullText.trim();
      try {
        return JSON.parse(stripFences(fullText));
      } catch (parseErr) {
        console.error("Could not parse model output as JSON:", fullText);
        const err = new Error("Got a response but couldn't read it as structured data");
        err.retryable = true;
        throw err;
      }
    } catch (e) {
      lastError = e;
      console.error(`callGemini attempt ${attempt}/${maxAttempts} failed:`, e);
      const retryable = e.retryable !== false && attempt < maxAttempts;
      if (!retryable) break;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
      onRetry?.(attempt, maxAttempts, delay, e.message);
      await sleep(delay);
    }
  }
  throw lastError;
}

// Single entry point the rest of the app calls — routes to whichever
// provider is currently selected without the callers needing to know.
async function callModel(provider, apiKey, system, content, onRetry, opts = {}) {
  if (provider === "gemini") return callGemini(apiKey, system, content, onRetry, opts);
  return callAnthropic(system, content, onRetry, opts);
}

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_FILES_PER_BATCH = 25;

// Patterns that indicate embedded active content in a PDF (JS, auto-launch
// actions, embedded executables). Legitimate resumes never need these —
// a match means the file is doing something a plain resume has no reason to do.
const SUSPICIOUS_PDF_PATTERNS = [
  /\/JavaScript\b/, /\/JS\b/, /\/OpenAction\b/, /\/AA\b/, /\/Launch\b/,
  /\/EmbeddedFile\b/, /\/RichMedia\b/, /\.(exe|bat|cmd|scr|ps1|vbs|jar|sh)\b/i,
];

function bytesToLatin1(bytes) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return s;
}

// Validates a File before it's ever touched by the app: extension/MIME,
// size ceiling, real PDF magic bytes (not just a trusted file extension),
// and a scan for embedded active-content markers. Throws with a clear
// reason on any failure; only returns base64 for files that pass every check.
async function readPdfSafely(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only .pdf files are accepted");
  }
  // Browsers are inconsistent about file.type — only use it as a soft check,
  // never a hard rejection. The magic-byte check below is the real gate.
  if (file.size === 0) throw new Error("File is empty");
  if (file.size > MAX_FILE_BYTES) throw new Error(`File exceeds the ${MAX_FILE_BYTES / (1024 * 1024)}MB limit`);

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Real PDFs start with %PDF- — this catches disguised/renamed files
  // (e.g. a script or binary saved with a .pdf extension).
  const header = bytesToLatin1(bytes.subarray(0, 5));
  if (header !== "%PDF-") throw new Error("File isn't a valid PDF (failed signature check)");

  // Scan only the PDF's structural text (object dictionaries), not the
  // compressed binary stream payloads (text, images, fonts). Compressed
  // bytes decoded as Latin-1 look like random noise and will spuriously
  // match short patterns like "/JS" — scanning them causes false positives
  // on completely ordinary resumes. Malicious triggers (/OpenAction, /JS,
  // /Launch) live in the uncompressed dictionary structure that references
  // those streams, so stripping stream bodies keeps the check meaningful.
  const text = bytesToLatin1(bytes).replace(/stream\r?\n[\s\S]*?endstream/g, "stream\nendstream");
  const hit = SUSPICIOUS_PDF_PATTERNS.find((p) => p.test(text));
  if (hit) throw new Error("Blocked: this PDF contains embedded scripts or active content, which isn't allowed");

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- PDF export ----------

let jsPDFPromise = null;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPDFPromise) {
    jsPDFPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve(window.jspdf.jsPDF);
      script.onerror = () => reject(new Error("Could not load PDF engine"));
      document.body.appendChild(script);
    });
  }
  return jsPDFPromise;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function exportCandidatePDF(candidate, jobTitle, jobDescription) {
  const jsPDF = await loadJsPDF();
  const r = candidate.result;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = 0;

  const verdictColor = { Interview: T.emerald, Maybe: T.amber, Pass: T.rose }[r.recommendation] || T.indigo;
  const riskColor = { Low: T.emerald, Medium: T.amber, High: T.rose }[r.aiRiskLevel] || T.mutedPaper;

  function ensureSpace(h) {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text, size, color, gapAfter = 6) {
    ensureSpace(size + gapAfter + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...hexToRgb(color));
    doc.text(text, margin, y);
    y += size * 0.8 + gapAfter;
  }

  function label(text, color) {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...hexToRgb(color));
    doc.text(text.toUpperCase(), margin, y);
    y += 14;
  }

  function body(text, size = 10.5, color = T.textInk, gapAfter = 10) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...hexToRgb(color));
    const lines = doc.splitTextToSize(text, maxW);
    ensureSpace(lines.length * (size * 1.35) + gapAfter);
    doc.text(lines, margin, y);
    y += lines.length * (size * 1.35) + gapAfter;
  }

  function rule() {
    ensureSpace(14);
    doc.setDrawColor(...hexToRgb(T.line));
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  }

  // header band
  doc.setFillColor(...hexToRgb(T.ink));
  doc.rect(0, 0, pageW, 78, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(T.paper));
  doc.text("Candor", margin, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...hexToRgb(T.mutedDark));
  doc.text(`Candidate report — ${jobTitle || "Role not specified"}`, margin, 52);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, margin, 66);

  y = 108;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...hexToRgb(T.textInk));
  doc.text(r.candidateName || "Candidate", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(T.mutedPaper));
  doc.text(r.currentTitle || "", margin, y);
  y += 22;

  // verdict chip
  doc.setDrawColor(...hexToRgb(verdictColor));
  doc.setFillColor(...hexToRgb(verdictColor));
  doc.setLineWidth(1.2);
  doc.roundedRect(margin, y - 14, 130, 26, 13, 13, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(verdictColor));
  doc.text(`${r.recommendation} — ${r.confidence}%`, margin + 14, y + 3);
  y += 34;

  body(r.summary, 11.5, T.textInk, 16);
  rule();

  label("Why — strengths", T.emerald);
  (r.strengths || []).forEach((s) => {
    body(`•  ${s.title} — ${s.detail}`, 10, T.textInk, 8);
  });
  y += 6;

  label("Potential concerns to probe", T.amber);
  (r.concerns || []).forEach((c) => {
    body(`•  ${c.title} — ${c.detail}`, 10, T.textInk, 8);
  });
  y += 6;
  rule();

  label("Achievement level", T.indigo);
  body(`Score: ${r.achievementScore}/100 — ${r.achievementNote}`, 10.5, T.textInk, 14);

  label("AI-content risk", riskColor);
  body(`${r.aiRiskLevel} — ${r.aiRiskNote}`, 10.5, T.textInk, 14);
  rule();

  label("Suggested interview questions", T.indigo);
  (r.questions || []).forEach((q, i) => {
    body(`${i + 1}.  ${q}`, 10.5, T.textInk, 8);
  });

  y += 10;
  ensureSpace(30);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(T.mutedPaper));
  doc.text("AI-assisted read, not a hiring decision. Use alongside your own judgment and interview process.", margin, y);

  const safeName = (r.candidateName || "candidate").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`candor_${safeName}.pdf`);
}

// ---------- small UI atoms ----------

function VerdictStamp({ recommendation, confidence, size = "md" }) {
  const v = VERDICT_STYLE[recommendation] || VERDICT_STYLE.Maybe;
  const big = size === "lg";
  return (
    <div
      style={{
        display: "inline-flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", transform: "rotate(-5deg)",
        width: big ? 108 : 76, height: big ? 108 : 76, borderRadius: "50%",
        border: `${big ? 3 : 2}px double ${v.c}`, color: v.c,
        background: v.s, flexShrink: 0,
      }}
    >
      <span style={{
        fontFamily: "'Fraunces', serif", fontWeight: 700,
        fontSize: big ? 15 : 11, letterSpacing: "0.03em",
        textTransform: "uppercase", lineHeight: 1.05, textAlign: "center",
      }}>
        {v.label}
      </span>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: big ? 13 : 10,
        marginTop: 2, opacity: 0.85,
      }}>
        {confidence}%
      </span>
    </div>
  );
}

function RiskBadge({ level }) {
  const c = RISK_STYLE[level] || T.mutedPaper;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      color: c, border: `1px solid ${c}55`, background: `${c}14`,
      padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap",
    }}>
      <ShieldAlert size={11} /> AI-RISK: {level.toUpperCase()}
    </span>
  );
}

function ScoreMeter({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: `${color}22`, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color, minWidth: 30, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children, color }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em",
      textTransform: "uppercase", color: color || T.mutedPaper, marginBottom: 10,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {children}
    </div>
  );
}

// ---------- hero (marketing) ----------

function Hero() {
  return (
    <div style={{
      padding: "52px 40px 44px", background: T.ink, color: T.textPaper,
      position: "relative", overflow: "hidden",
    }}>
      {/* faint editorial rule pattern, kept behind everything else */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(115deg, transparent 0 78px, ${T.lineDark}55 78px 79px)`,
      }} />
      <div style={{
        position: "absolute", top: -140, right: -100, width: 360, height: 360, borderRadius: "50%",
        background: `radial-gradient(circle, ${T.emerald}22 0%, transparent 70%)`, pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: 48, alignItems: "center", position: "relative" }}>
        <div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: T.emerald, border: `1px solid ${T.emerald}55`, background: `${T.emerald}14`,
            padding: "5px 10px", borderRadius: 20, marginBottom: 20,
          }}>
            <Sparkles size={12} /> Judgment, not another keyword scanner
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontWeight: 600, fontStyle: "normal",
            fontSize: 46, lineHeight: 1.08, margin: 0, letterSpacing: "-0.01em",
          }}>
            Would a <span style={{ fontStyle: "italic", color: T.emerald }}>good recruiter</span> interview them?
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 16, lineHeight: 1.55,
            color: T.mutedDark, marginTop: 16, maxWidth: 480,
          }}>
            Most "AI resume intelligence" is a faster keyword scanner in a nicer wrapper.
            Candor doesn't score overlap with the posting — it reasons about trajectory,
            transferable skills, and real impact, the way your sharpest recruiter would.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            {["Finds strengths you didn't ask about", "Concerns ≠ rejection", "Built-in AI-content detector", "Ranks candidates against each other"].map((t) => (
              <span key={t} style={{
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5, color: T.textPaper,
                border: `1px solid ${T.lineDark}`, borderRadius: 20, padding: "6px 12px",
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div style={{
            background: T.paper, color: T.textInk, borderRadius: 6, padding: "22px 24px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)", transform: "rotate(1.5deg)",
            fontFamily: "'Inter', sans-serif", fontSize: 13.5, lineHeight: 1.7,
          }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
              M. Okafor — Senior Analyst
            </div>
            <p style={{ margin: 0 }}>
              Led a{" "}
              <span style={{ background: `${T.emerald}33`, borderBottom: `2px solid ${T.emerald}`, padding: "0 2px" }}>
                migration that cut reporting time 40%
              </span>{" "}
              with no formal engineering title.{" "}
              <span style={{ background: `${T.amber}33`, borderBottom: `2px solid ${T.amber}`, padding: "0 2px" }}>
                Six-month gap in 2023
              </span>{" "}
              — worth a question, not a rejection.
            </p>
          </div>
          <div style={{ position: "absolute", top: -18, right: -14 }}>
            <VerdictStamp recommendation="Interview" confidence={87} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- candidate detail ----------

function CandidateDetail({ candidate, onExport, exporting }) {
  if (!candidate) return null;
  const { result, fileName, status, error, note } = candidate;

  if (status === "queued") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.mutedPaper }}>
        <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, marginTop: 10 }}>
          Queued — {fileName} is next in line…
        </p>
      </div>
    );
  }
  if (status === "analyzing") {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.mutedPaper }}>
        <Loader2 size={22} className="spin" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, marginTop: 10 }}>
          {note || `Reading ${fileName} the way a recruiter would…`}
        </p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div style={{ padding: 32, textAlign: "center", color: T.rose }}>
        <AlertTriangle size={22} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, marginTop: 10 }}>
          Couldn't analyze {fileName}. {error}
          {isOverloadedMessage(error) && " — this usually clears up within a minute or two."}
        </p>
      </div>
    );
  }
  if (!result) return null;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", paddingBottom: 22, borderBottom: `1px solid ${T.line}` }}>
        <VerdictStamp recommendation={result.recommendation} confidence={result.confidence} size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: T.textInk }}>
              {result.candidateName}
            </div>
            <button onClick={onExport} disabled={exporting} style={{ ...btnStyle(T.ink), flexShrink: 0 }}>
              {exporting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={13} />}
              {exporting ? "Preparing…" : "Export PDF"}
            </button>
          </div>
          <div style={{ fontSize: 13, color: T.mutedPaper, marginBottom: 10 }}>{result.currentTitle}</div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: T.textInk, margin: 0 }}>{result.summary}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 26 }}>
        <div>
          <SectionLabel color={T.emerald}><CheckCircle2 size={13} /> Why — strengths</SectionLabel>
          {result.strengths.map((s, i) => (
            <div key={i} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `2px solid ${T.emerald}` }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textInk }}>{s.title}</div>
              <div style={{ fontSize: 13, color: T.mutedPaper, lineHeight: 1.5 }}>{s.detail}</div>
            </div>
          ))}
        </div>
        <div>
          <SectionLabel color={T.amber}><AlertTriangle size={13} /> Potential concerns to probe</SectionLabel>
          {result.concerns.map((c, i) => (
            <div key={i} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `2px solid ${T.amber}` }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textInk }}>{c.title}</div>
              <div style={{ fontSize: 13, color: T.mutedPaper, lineHeight: 1.5 }}>{c.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, marginTop: 26 }}>
        <div style={{ background: T.paper2, borderRadius: 6, padding: 16 }}>
          <SectionLabel color={T.indigo}><TrendingUp size={13} /> Achievement level</SectionLabel>
          <ScoreMeter value={result.achievementScore} color={T.indigo} />
          <p style={{ fontSize: 12.5, color: T.mutedPaper, marginTop: 8, lineHeight: 1.5 }}>{result.achievementNote}</p>
        </div>
        <div style={{ background: T.paper2, borderRadius: 6, padding: 16 }}>
          <SectionLabel color={RISK_STYLE[result.aiRiskLevel]}><ShieldAlert size={13} /> AI-content detector</SectionLabel>
          <RiskBadge level={result.aiRiskLevel} />
          <p style={{ fontSize: 12.5, color: T.mutedPaper, marginTop: 8, lineHeight: 1.5 }}>{result.aiRiskNote}</p>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionLabel color={T.indigo}><HelpCircle size={13} /> Ask this candidate</SectionLabel>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {result.questions.map((q, i) => (
            <li key={i} style={{ fontSize: 13.5, color: T.textInk, lineHeight: 1.9 }}>{q}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------- candidate card (list item) ----------

function CandidateCard({ candidate, active, onClick, onRetry }) {
  const { fileName, status, result, error, note } = candidate;
  return (
    <div
      onClick={status === "done" ? onClick : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        borderRadius: 8, cursor: status === "done" ? "pointer" : "default",
        background: active ? T.indigoSoft : "transparent",
        border: `1px solid ${active ? T.indigo + "55" : T.line}`,
        marginBottom: 8, transition: "background 0.15s",
      }}
    >
      {(status === "analyzing" || status === "queued") && <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: T.mutedPaper, flexShrink: 0 }} />}
      {status === "error" && <AlertTriangle size={20} style={{ color: T.rose, flexShrink: 0 }} />}
      {status === "done" && <VerdictStamp recommendation={result.recommendation} confidence={result.confidence} size="sm" />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14.5, color: T.textInk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {status === "done" ? result.candidateName : fileName}
        </div>
        <div style={{ fontSize: 12, color: T.mutedPaper }}>
          {status === "queued" && "Queued…"}
          {status === "analyzing" && (note || "Analyzing…")}
          {status === "error" && <span style={{ color: T.rose }}>{error} — <button onClick={(e) => { e.stopPropagation(); onRetry(); }} style={{ background: "none", border: "none", color: T.rose, textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0 }}>retry</button></span>}
          {status === "done" && result.currentTitle}
        </div>
        {status === "done" && (
          <div style={{ marginTop: 4 }}>
            <RiskBadge level={result.aiRiskLevel} />
          </div>
        )}
      </div>
      {status === "done" && <ChevronRight size={16} color={T.mutedPaper} style={{ flexShrink: 0 }} />}
    </div>
  );
}

// ---------- compare view ----------

function CompareView({ candidates, compareState, onRun, jobTitle }) {
  const done = candidates.filter((c) => c.status === "done");

  if (done.length < 2) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: T.mutedPaper, fontFamily: "'Inter', sans-serif" }}>
        <Users size={24} style={{ marginBottom: 10 }} />
        <p style={{ fontSize: 14 }}>Analyze at least two candidates for the same role to compare and rank them.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, color: T.textInk }}>
            Ranked for: {jobTitle || "this role"}
          </div>
          <div style={{ fontSize: 12.5, color: T.mutedPaper }}>{done.length} candidates assessed</div>
        </div>
        <button onClick={onRun} disabled={compareState.loading} style={btnStyle(T.indigo)}>
          {compareState.loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowUpDown size={14} />}
          {compareState.loading ? (compareState.note || "Ranking…") : "Rank candidates"}
        </button>
      </div>

      {compareState.error && <p style={{ color: T.rose, fontSize: 13 }}>{compareState.error}</p>}

      {compareState.data && (
        <div>
          {[...compareState.data.ranking]
            .sort((a, b) => a.rank - b.rank)
            .map((r) => {
              const c = done.find((c) => c.id === r.id);
              if (!c) return null;
              return (
                <div key={r.id} style={{
                  display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 4px",
                  borderBottom: `1px solid ${T.line}`,
                }}>
                  <div style={{
                    fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600,
                    color: T.mutedPaper, width: 42, textAlign: "center", flexShrink: 0,
                  }}>
                    {r.rank}
                  </div>
                  <VerdictStamp recommendation={c.result.recommendation} confidence={c.result.confidence} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15.5, color: T.textInk }}>
                      {c.result.candidateName}
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 12.5, color: T.mutedPaper, marginLeft: 8 }}>
                        {c.result.currentTitle}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, color: T.textInk, lineHeight: 1.55, margin: "4px 0 6px" }}>{r.reason}</p>
                    <div style={{ display: "flex", gap: 14, fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: T.mutedPaper }}>
                      <span>ACHIEVEMENT {c.result.achievementScore}</span>
                      <span>AI-RISK {c.result.aiRiskLevel.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    display: "inline-flex", alignItems: "center", gap: 7,
    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
    color: "#fff", background: color, border: "none",
    padding: "9px 16px", borderRadius: 7, cursor: "pointer",
  };
}

// ---------- AI provider switcher ----------

function ProviderSwitcher({ provider, setProvider, apiKey, setApiKey, open, setOpen }) {
  const current = PROVIDERS[provider];
  const needsKey = current.needsKey && !apiKey;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...btnStyle(needsKey ? T.amber : T.paper2),
          color: needsKey ? "#fff" : T.textInk,
        }}
      >
        <Settings2 size={13} /> {current.label}
        {needsKey && <span style={{ fontSize: 11 }}>· needs key</span>}
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, zIndex: 10,
            background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10,
            boxShadow: "0 12px 32px rgba(18,25,43,0.18)", padding: 16,
          }}>
            <SectionLabel color={T.indigo}>AI engine</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setProvider(key)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5,
                    padding: "10px 8px", borderRadius: 8, cursor: "pointer",
                    border: `1.5px solid ${provider === key ? p.accent : T.line}`,
                    background: provider === key ? `${p.accent}14` : "transparent",
                    color: provider === key ? p.accent : T.textInk,
                  }}
                >
                  <Radar size={15} />
                  {p.label}
                </button>
              ))}
            </div>
            {current.needsKey && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <KeyRound size={12} color={T.mutedPaper} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.mutedPaper, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Gemini API key
                  </span>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key…"
                  style={{
                    width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                    border: `1px solid ${T.line}`, borderRadius: 6, padding: "8px 9px",
                    color: T.textInk, background: "transparent",
                  }}
                />
                <p style={{ fontSize: 11, color: T.mutedPaper, lineHeight: 1.5, margin: "8px 0 0" }}>
                  Kept in memory for this session only — never saved or sent anywhere but Google's API.
                  Get a free key at aistudio.google.com/apikey. Calls go straight from your browser to
                  Google, so avoid this on a shared machine.
                </p>
              </div>
            )}
            {!current.needsKey && (
              <p style={{ fontSize: 11.5, color: T.mutedPaper, lineHeight: 1.5, margin: 0 }}>
                Claude runs through Candor's built-in connection — no key needed.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- main app ----------

export default function CandorApp() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("analyze");
  const [compareState, setCompareState] = useState({ loading: false, error: null, data: null });
  const [exportingId, setExportingId] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [jdUrl, setJdUrl] = useState("");
  const [jdImporting, setJdImporting] = useState(false);
  const [jdImportError, setJdImportError] = useState(null);
  const [showManualJd, setShowManualJd] = useState(false);
  const [aiProvider, setAiProvider] = useState("claude");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef(null);
  const queueRef = useRef([]);
  const processingRef = useRef(false);

  const handleExport = useCallback(async (candidate) => {
    setExportError(null);
    setExportingId(candidate.id);
    try {
      await exportCandidatePDF(candidate, jobTitle, jobDescription);
    } catch (e) {
      setExportError(e.message);
    } finally {
      setExportingId(null);
    }
  }, [jobTitle, jobDescription]);

  const importJobFromUrl = useCallback(async () => {
    const url = jdUrl.trim();
    if (!url) return;
    setJdImporting(true);
    setJdImportError(null);
    try {
      const text = await callModel(
        aiProvider, geminiApiKey,
        JOB_IMPORT_SYSTEM_PROMPT,
        [{ type: "text", text: `URL: ${url}` }],
        null,
        { tools: [{ type: "web_search_20250305", name: "web_search" }], expectJson: false }
      );
      if (!text || text.trim() === "FETCH_FAILED") {
        setJdImportError("Couldn't read that page — paste the description in manually instead.");
        return;
      }
      const lines = text.trim().split("\n");
      const firstLine = lines[0]?.trim();
      if (firstLine && firstLine.length < 100) {
        setJobTitle(firstLine);
        setJobDescription(lines.slice(1).join("\n").trim());
      } else {
        setJobDescription(text.trim());
      }
      setJdUrl("");
    } catch (e) {
      setJdImportError(e.message || "Couldn't import that link — paste the description in manually instead.");
    } finally {
      setJdImporting(false);
    }
  }, [jdUrl, aiProvider, geminiApiKey]);

  const analyzeOne = useCallback(async (candidateId, file) => {
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status: "analyzing" } : c)));
    try {
      const base64 = await readPdfSafely(file);
      const content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        {
          type: "text",
          text: `JOB TITLE: ${jobTitle || "Not specified"}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nAnalyze the attached resume for this role. Respond only with the JSON schema described in your instructions.`,
        },
      ];
      const result = await callModel(aiProvider, geminiApiKey, SYSTEM_PROMPT, content, (attempt, max, delay, reason) => {
        setCandidates((prev) => prev.map((c) => (c.id === candidateId
          ? { ...c, note: `Retrying (${attempt}/${max - 1})… ${reason || ""}` }
          : c)));
      });
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status: "done", result, note: null } : c)));
    } catch (e) {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status: "error", error: e.message, note: null } : c)));
    }
  }, [jobTitle, jobDescription, aiProvider, geminiApiKey]);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const job = queueRef.current.shift();
      await analyzeOne(job.id, job.file);
      if (queueRef.current.length > 0) await sleep(500); // stagger requests instead of bursting them
    }
    processingRef.current = false;
  }, [analyzeOne]);

  const enqueueAnalysis = useCallback((id, file) => {
    queueRef.current.push({ id, file });
    processQueue();
  }, [processQueue]);

  const handleFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList);
    const room = MAX_FILES_PER_BATCH - candidates.length;
    const accepted = incoming.slice(0, Math.max(room, 0));
    const overflow = incoming.length - accepted.length;

    const newCandidates = accepted.map((f) => {
      const looksLikePdf = f.name.toLowerCase().endsWith(".pdf") && f.type === "application/pdf";
      return looksLikePdf
        ? { id: uid(), fileName: f.name, status: "queued", result: null, error: null, note: null, _file: f }
        : { id: uid(), fileName: f.name, status: "error", result: null, error: "Only .pdf files are accepted", note: null, _file: f };
    });
    setCandidates((prev) => [...prev, ...newCandidates]);
    newCandidates.filter((c) => c.status === "queued").forEach((c) => enqueueAnalysis(c.id, c._file));
    setUploadNotice(overflow > 0 ? `Only ${MAX_FILES_PER_BATCH} resumes per role — ${overflow} file(s) were not added.` : null);
  }, [enqueueAnalysis, candidates.length]);

  const retryOne = useCallback((candidateId) => {
    const c = candidates.find((c) => c.id === candidateId);
    if (!c) return;
    setCandidates((prev) => prev.map((x) => (x.id === candidateId ? { ...x, status: "queued", error: null } : x)));
    enqueueAnalysis(candidateId, c._file);
  }, [candidates, enqueueAnalysis]);

  const runComparison = useCallback(async () => {
    const done = candidates.filter((c) => c.status === "done");
    setCompareState({ loading: true, error: null, data: null });
    try {
      const payload = done.map((c) => ({
        id: c.id,
        candidateName: c.result.candidateName,
        currentTitle: c.result.currentTitle,
        recommendation: c.result.recommendation,
        confidence: c.result.confidence,
        summary: c.result.summary,
        strengths: c.result.strengths,
        concerns: c.result.concerns,
        achievementScore: c.result.achievementScore,
        aiRiskLevel: c.result.aiRiskLevel,
      }));
      const content = [{
        type: "text",
        text: `JOB TITLE: ${jobTitle || "Not specified"}\nJOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE ASSESSMENTS:\n${JSON.stringify(payload)}\n\nRank these candidates for this role, comparing them to each other. Respond only with the JSON schema described in your instructions.`,
      }];
      const data = await callModel(aiProvider, geminiApiKey, COMPARE_SYSTEM_PROMPT, content, (attempt, max, delay, reason) => {
        setCompareState((prev) => ({ ...prev, loading: true, note: `Retrying (${attempt}/${max - 1})… ${reason || ""}` }));
      });
      setCompareState({ loading: false, error: null, data, note: null });
    } catch (e) {
      const msg = isOverloadedMessage(e.message)
        ? `${e.message} — this usually clears up within a minute or two.`
        : e.message;
      setCompareState({ loading: false, error: msg, data: null, note: null });
    }
  }, [candidates, jobTitle, jobDescription, aiProvider, geminiApiKey]);

  const reset = () => {
    setJobTitle(""); setJobDescription(""); setCandidates([]);
    setActiveId(null); setTab("analyze"); setCompareState({ loading: false, error: null, data: null });
    setUploadNotice(null); setExportError(null);
  };

  const active = candidates.find((c) => c.id === activeId);
  const doneCount = candidates.filter((c) => c.status === "done").length;

  return (
    <div style={{ background: T.paper, minHeight: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .drop-zone:hover { border-color: ${T.indigo} !important; background: ${T.indigoSoft} !important; }
        button:focus-visible, [tabindex]:focus-visible { outline: 2px solid ${T.indigo}; outline-offset: 2px; }
        textarea:focus, input:focus { outline: none; border-color: ${T.indigo} !important; }
      `}</style>

      {candidates.length === 0 && <Hero />}

      {/* header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", borderBottom: `1px solid ${T.line}`,
        background: T.paper, position: "sticky", top: 0, zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", border: `2px double ${T.ink}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Circle size={8} fill={T.ink} color={T.ink} />
          </div>
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: T.textInk }}>Candor</span>
          {candidates.length > 0 && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.mutedPaper, marginLeft: 4 }}>
              — would a good recruiter interview them?
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {candidates.length > 0 && (
            <div style={{ display: "flex", background: T.paper2, borderRadius: 8, padding: 3 }}>
              {["analyze", "compare"].map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  border: "none", background: tab === t ? T.ink : "transparent",
                  color: tab === t ? T.textPaper : T.mutedPaper,
                  fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5,
                  padding: "7px 14px", borderRadius: 6, cursor: "pointer", textTransform: "capitalize",
                }}>
                  {t === "analyze" ? `Analyze (${candidates.length})` : `Compare${doneCount >= 2 ? ` (${doneCount})` : ""}`}
                </button>
              ))}
            </div>
          )}
          {candidates.length > 0 && (
            <button onClick={reset} style={{ ...btnStyle(T.paper2), color: T.textInk }}>
              <RotateCcw size={13} /> New role
            </button>
          )}
          <ProviderSwitcher
            provider={aiProvider} setProvider={setAiProvider}
            apiKey={geminiApiKey} setApiKey={setGeminiApiKey}
            open={settingsOpen} setOpen={setSettingsOpen}
          />
        </div>
      </div>

      {tab === "analyze" && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
          {/* job inputs */}
          <div style={{ display: "grid", gridTemplateColumns: candidates.length === 0 ? "1fr" : "320px 1fr", gap: 24 }}>
            <div>
              <div style={{
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10, padding: 18,
                marginBottom: 18,
              }}>
                <SectionLabel color={T.indigo}>Role</SectionLabel>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.mutedPaper, margin: "-4px 0 10px", lineHeight: 1.5 }}>
                  Drop in the posting link — no copy-pasting the whole listing.
                </p>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input
                    value={jdUrl} onChange={(e) => setJdUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") importJobFromUrl(); }}
                    placeholder="Paste a job posting URL…"
                    style={{
                      flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                      border: `1px solid ${T.line}`, borderRadius: 6, padding: "7px 9px",
                      color: T.textInk, background: "transparent", minWidth: 0,
                    }}
                  />
                  <button onClick={importJobFromUrl} disabled={jdImporting || !jdUrl.trim()} style={{ ...btnStyle(T.indigo), padding: "7px 12px", opacity: jdUrl.trim() ? 1 : 0.5 }}>
                    {jdImporting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={13} />}
                    {jdImporting ? "Reading…" : "Import"}
                  </button>
                </div>
                {jdImportError && <p style={{ fontSize: 11.5, color: T.rose, margin: "0 0 10px" }}>{jdImportError}</p>}

                {(jobDescription.trim() || showManualJd) ? (
                  <div style={{ marginTop: 14 }}>
                    <input
                      value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Product Designer"
                      style={{
                        width: "100%", fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600,
                        border: `1px solid ${T.line}`, borderRadius: 6, padding: "8px 10px", marginBottom: 12,
                        color: T.textInk, background: "transparent",
                      }}
                    />
                    <textarea
                      value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here…"
                      rows={candidates.length === 0 ? 6 : 10}
                      style={{
                        width: "100%", fontFamily: "'Inter', sans-serif", fontSize: 13.5, lineHeight: 1.55,
                        border: `1px solid ${T.line}`, borderRadius: 6, padding: 10, resize: "vertical",
                        color: T.textInk, background: "transparent",
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowManualJd(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, marginTop: 4,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.mutedPaper,
                      textDecoration: "underline", textUnderlineOffset: 2,
                    }}
                  >
                    or type the title and description in by hand
                  </button>
                )}
              </div>

              <div
                className="drop-zone"
                onClick={() => {
                  if (!jobDescription.trim()) { setUploadNotice("Add a job description above before uploading resumes."); return; }
                  fileInputRef.current?.click();
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!jobDescription.trim()) { setUploadNotice("Add a job description above before uploading resumes."); return; }
                  handleFiles(e.dataTransfer.files);
                }}
                style={{
                  border: `2px dashed ${T.line}`, borderRadius: 10, padding: 24, textAlign: "center",
                  cursor: "pointer", opacity: jobDescription.trim() ? 1 : 0.7, transition: "all 0.15s",
                }}
              >
                <Upload size={20} color={T.indigo} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, color: T.textInk, margin: "8px 0 2px" }}>
                  Drop resumes (PDF) here
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.mutedPaper, margin: 0 }}>
                  {jobDescription.trim() ? "or click to browse — multiple files supported" : "Click to browse — you'll need a job description first"}
                </p>
                <input
                  ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple hidden
                  onChange={(e) => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ""; }}
                />
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.mutedPaper, margin: "8px 2px 0" }}>
                PDF only · signature-checked · scripts/active content blocked · max {MAX_FILE_BYTES / (1024 * 1024)}MB each
              </p>
              {uploadNotice && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.amber, marginTop: 6 }}>{uploadNotice}</p>
              )}

              {candidates.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <SectionLabel>Candidates</SectionLabel>
                  {candidates.map((c) => (
                    <CandidateCard
                      key={c.id} candidate={c} active={c.id === activeId}
                      onClick={() => setActiveId(c.id)} onRetry={() => retryOne(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {candidates.length > 0 && (
              <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10, padding: 26, minHeight: 400 }}>
                {exportError && (
                  <p style={{ color: T.rose, fontSize: 12.5, fontFamily: "'Inter', sans-serif", marginBottom: 14 }}>
                    Couldn't export PDF: {exportError}
                  </p>
                )}
                {active ? (
                  <CandidateDetail candidate={active} onExport={() => handleExport(active)} exporting={exportingId === active.id} />
                ) : (
                  <div style={{ textAlign: "center", padding: 60, color: T.mutedPaper, fontFamily: "'Inter', sans-serif", fontSize: 13.5 }}>
                    <FileText size={22} style={{ marginBottom: 8 }} />
                    <p>Select a candidate on the left to see the full read.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "compare" && (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10, marginTop: 24, marginBottom: 40 }}>
            <CompareView candidates={candidates} compareState={compareState} onRun={runComparison} jobTitle={jobTitle} />
          </div>
        </div>
      )}
    </div>
  );
}
