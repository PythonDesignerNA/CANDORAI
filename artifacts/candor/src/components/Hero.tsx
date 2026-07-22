import React from 'react';
import { VerdictStamp } from './VerdictStamp';
import { RiskBadge } from './RiskBadge';
import { ScoreMeter } from './ScoreMeter';

export function Hero() {
  return (
    <div className="px-8 pt-16 pb-14 md:pt-24 md:pb-20">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
        <div>
          <p className="font-sans font-medium text-[13px] text-indigo mb-5">
            Not another keyword-matching resume scanner
          </p>

          <h1 className="font-serif font-semibold text-[44px] leading-[1.08] tracking-tight m-0 text-ink">
            Would a good recruiter interview them?
          </h1>

          <p className="font-sans text-[17px] leading-relaxed text-muted-paper mt-6 max-w-lg">
            Candor doesn't score keyword overlap with the posting. It reasons about
            trajectory, transferable skills, and real impact — the way your sharpest
            recruiter reads a resume — then tells you exactly why.
          </p>

          <ul className="mt-8 space-y-3 max-w-md">
            {[
              "Surfaces strengths the job description didn't ask about",
              "Flags concerns without treating them as disqualifiers",
              "Screens for AI-generated resume content",
              "Ranks every candidate against the others, with reasons",
            ].map(t => (
              <li key={t} className="flex items-start gap-3 text-[14.5px] text-ink">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo mt-[7px] shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Live product preview, not a stylized mockup */}
        <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wide text-muted-paper">Candidate read</span>
            <VerdictStamp recommendation="Interview" confidence={87} size="sm" />
          </div>
          <div className="p-5">
            <div className="font-serif font-semibold text-[17px] text-ink">M. Okafor</div>
            <div className="text-[12.5px] text-muted-paper mb-3">Senior Analyst → applying for Staff PM</div>
            <p className="text-[13.5px] leading-relaxed text-ink m-0">
              Led a <span className="bg-emerald-soft text-emerald px-1 rounded">migration that cut reporting time 40%</span> with
              no formal engineering title. <span className="bg-amber-soft text-amber px-1 rounded">Six-month gap in 2023</span> —
              worth a question, not a rejection.
            </p>
            <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted-paper mb-1.5">Achievement</div>
                <ScoreMeter value={82} />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted-paper mb-1.5">AI content</div>
                <RiskBadge level="Low" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
