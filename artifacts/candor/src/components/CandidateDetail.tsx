import React, { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, ShieldAlert, Download } from 'lucide-react';
import { VerdictStamp } from './VerdictStamp';
import { RiskBadge } from './RiskBadge';
import { ScoreMeter } from './ScoreMeter';
import { Candidate } from '../hooks/use-candor';
import { exportCandidatePDF } from '../utils/pdf-export';

export function CandidateDetail({ candidate, jobTitle, jobDescription }: { candidate: Candidate, jobTitle: string, jobDescription: string }) {
  const [exporting, setExporting] = useState(false);

  if (!candidate) return null;
  const { status, fileName, result, error, note } = candidate;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCandidatePDF(candidate, jobTitle, jobDescription);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  if (status === 'queued') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-muted-paper">
        <Loader2 size={24} className="animate-spin mb-4" />
        <p className="text-[14px]">Queued — {fileName} is next in line…</p>
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-indigo">
        <Loader2 size={24} className="animate-spin mb-4" />
        <p className="text-[14px]">{note || `Reading ${fileName} the way a recruiter would…`}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-rose">
        <AlertTriangle size={24} className="mb-4" />
        <p className="text-[14px] max-w-sm text-center">
          Couldn't analyze {fileName}. {error}
        </p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-6 items-start pb-6 border-b border-line">
        <VerdictStamp recommendation={result.recommendation} confidence={result.confidence} size="lg" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-[28px] font-semibold text-ink m-0">
              {result.candidateName}
            </h2>
            <button 
              onClick={handleExport} 
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-line text-[13px] font-medium text-ink hover:bg-paper-2 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? "Preparing…" : "Export PDF"}
            </button>
          </div>
          <div className="text-[14px] text-muted-paper mb-4">{result.currentTitle}</div>
          <p className="text-[15px] leading-relaxed text-text-ink m-0">{result.summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-emerald mb-4">
            <CheckCircle2 size={13} /> Why — strengths
          </div>
          <div className="space-y-4">
            {result.strengths.map((s, i) => (
              <div key={i} className="pl-3 border-l-2 border-emerald">
                <div className="font-semibold text-[14px] text-ink">{s.title}</div>
                <div className="text-[13.5px] leading-relaxed text-muted-dark mt-0.5">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber mb-4">
            <AlertTriangle size={13} /> Potential concerns to probe
          </div>
          <div className="space-y-4">
            {result.concerns.map((c, i) => (
              <div key={i} className="pl-3 border-l-2 border-amber">
                <div className="font-semibold text-[14px] text-ink">{c.title}</div>
                <div className="text-[13.5px] leading-relaxed text-muted-dark mt-0.5">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10 pt-10 border-t border-line">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-indigo mb-4">
            <CheckCircle2 size={13} /> Achievement Level
          </div>
          <div className="bg-white border border-line rounded-lg p-5 shadow-sm">
            <div className="mb-3">
              <ScoreMeter value={result.achievementScore} />
            </div>
            <p className="text-[13.5px] text-muted-dark leading-relaxed m-0">
              {result.achievementNote}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-rose mb-4">
            <ShieldAlert size={13} /> AI-Content Risk
          </div>
          <div className="bg-white border border-line rounded-lg p-5 shadow-sm">
            <div className="mb-3">
              <RiskBadge level={result.aiRiskLevel} />
            </div>
            <p className="text-[13.5px] text-muted-dark leading-relaxed m-0">
              {result.aiRiskNote}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-10 border-t border-line">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-indigo mb-5">
          <CheckCircle2 size={13} /> Suggested Interview Questions
        </div>
        <div className="bg-white border border-line rounded-xl overflow-hidden shadow-sm">
          {result.questions.map((q, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-line last:border-0 hover:bg-paper/30 transition-colors">
              <div className="font-mono text-[13px] text-indigo font-medium shrink-0 pt-0.5">{i + 1}.</div>
              <div className="text-[14.5px] text-ink leading-relaxed">{q}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
