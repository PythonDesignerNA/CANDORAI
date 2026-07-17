import React from 'react';
import { Sparkles } from 'lucide-react';
import { VerdictStamp } from './VerdictStamp';

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-ink text-text-paper px-10 py-16 md:py-24 rounded-2xl shadow-2xl mx-8 mt-6">
      {/* background pattern */}
      <div 
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{ backgroundImage: `repeating-linear-gradient(115deg, transparent 0 78px, rgba(44, 54, 96, 0.3) 78px 79px)` }} 
      />
      <div 
        className="absolute top-[-140px] right-[-100px] w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, rgba(47, 143, 91, 0.15) 0%, transparent 70%)` }} 
      />

      <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-12 items-center relative">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase text-emerald border border-emerald/30 bg-emerald/10 px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={12} /> Judgment, not another keyword scanner
          </div>
          
          <h1 className="font-serif font-semibold text-5xl leading-[1.08] tracking-tight m-0 text-white">
            Would a <span className="italic text-emerald">good recruiter</span> interview them?
          </h1>
          
          <p className="font-sans text-[16px] leading-relaxed text-muted-dark mt-6 max-w-lg">
            Most "AI resume intelligence" is a faster keyword scanner in a nicer wrapper.
            Candor doesn't score overlap with the posting. It reasons about trajectory,
            transferable skills, and real impact, the way your sharpest recruiter would.
          </p>

          <div className="flex gap-2 mt-8 flex-wrap">
            {["Finds strengths you didn't ask about", "Concerns are not rejections", "Built-in AI-content detector", "Ranks candidates against each other"].map(t => (
              <span key={t} className="font-sans font-semibold text-[12.5px] text-text-paper border border-line-dark rounded-full px-3 py-1.5 bg-white/5 backdrop-blur-sm">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mt-10 lg:mt-0">
          <div className="bg-paper text-ink rounded-lg p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] rotate-[1.5deg] font-sans text-[13.5px] leading-[1.7] border border-line/50">
            <div className="font-serif font-semibold text-[16px] mb-2 text-ink">
              M. Okafor, Senior Analyst
            </div>
            <p className="m-0 text-text-ink">
              Led a <span className="bg-emerald/20 border-b-2 border-emerald px-1">migration that cut reporting time 40%</span> with no formal engineering title. <span className="bg-amber/20 border-b-2 border-amber px-1">Six-month gap in 2023</span>: worth a question, not a rejection.
            </p>
          </div>
          <div className="absolute -top-5 -right-3 shadow-xl rounded-full bg-paper">
            <VerdictStamp recommendation="Interview" confidence={87} size="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
