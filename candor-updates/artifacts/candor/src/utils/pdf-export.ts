import { Candidate } from '../hooks/use-candor';

let jsPDFPromise: Promise<any> | null = null;

function loadJsPDF() {
  if ((window as any).jspdf) return Promise.resolve((window as any).jspdf.jsPDF);
  if (!jsPDFPromise) {
    jsPDFPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve((window as any).jspdf.jsPDF);
      script.onerror = () => reject(new Error("Could not load PDF engine"));
      document.body.appendChild(script);
    });
  }
  return jsPDFPromise;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const T = {
  ink: "#14161A",
  paper: "#FFFFFF",
  textInk: "#14161A",
  mutedDark: "#9B9BA3",
  mutedPaper: "#6B6B76",
  emerald: "#1F7A5C",
  amber: "#A8681A",
  rose: "#A8402E",
  indigo: "#2A3EAA",
  line: "#E3E3E7",
};

export async function exportCandidatePDF(candidate: Candidate, jobTitle: string, jobDescription: string) {
  const jsPDF = await loadJsPDF();
  const r = candidate.result;
  if (!r) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = 0;

  const verdictColor = { Interview: T.emerald, Maybe: T.amber, Pass: T.rose }[r.recommendation] || T.indigo;
  const riskColor = { Low: T.emerald, Medium: T.amber, High: T.rose }[r.aiRiskLevel] || T.mutedPaper;

  function ensureSpace(h: number) {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string, size: number, color: string, gapAfter = 6) {
    ensureSpace(size + gapAfter + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...hexToRgb(color));
    doc.text(text, margin, y);
    y += size * 0.8 + gapAfter;
  }

  function label(text: string, color: string) {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...hexToRgb(color));
    doc.text(text.toUpperCase(), margin, y);
    y += 14;
  }

  function body(text: string, size = 10.5, color = T.textInk, gapAfter = 10) {
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
  doc.text(`Candidate report - ${jobTitle || "Role not specified"}`, margin, 52);
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
  doc.text(`${r.recommendation} - ${r.confidence}%`, margin + 14, y + 3);
  y += 34;

  body(r.summary, 11.5, T.textInk, 16);
  rule();

  label("Why - strengths", T.emerald);
  (r.strengths || []).forEach((s: any) => {
    body(`•  ${s.title} - ${s.detail}`, 10, T.textInk, 8);
  });
  y += 6;

  label("Potential concerns to probe", T.amber);
  (r.concerns || []).forEach((c: any) => {
    body(`•  ${c.title} - ${c.detail}`, 10, T.textInk, 8);
  });
  y += 6;
  rule();

  label("Achievement level", T.indigo);
  body(`Score: ${r.achievementScore}/100 - ${r.achievementNote}`, 10.5, T.textInk, 14);

  label("AI-content risk", riskColor);
  body(`${r.aiRiskLevel} - ${r.aiRiskNote}`, 10.5, T.textInk, 14);
  rule();

  label("Suggested interview questions", T.indigo);
  (r.questions || []).forEach((q: string, i: number) => {
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
