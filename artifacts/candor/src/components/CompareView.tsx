import React, { useState } from 'react';
import { Loader2, AlertTriangle, Medal, Layers, Scale, RotateCcw } from 'lucide-react';
import { Candidate } from '../hooks/use-candor';
import { UseMutationResult } from '@tanstack/react-query';
import { CompareInput, CompareResult } from '@workspace/api-client-react';
import { VerdictStamp } from './VerdictStamp';
import { RiskBadge } from './RiskBadge';
import { ScoreMeter } from './ScoreMeter';
import { clsx } from 'clsx';

interface CompareViewProps {
  candidates: Candidate[];
  jobTitle: string;
  jobDescription: string;
  compareCandidates: UseMutationResult<CompareResult, unknown, { data: CompareInput }, unknown>;
}

export function CompareView({ candidates, jobTitle, jobDescription, compareCandidates }: CompareViewProps) {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const validCandidates = candidates.filter(c => c.status === 'success' && c.result);
  
  const handleCompare = async () => {
    if (validCandidates.length < 2) return;
    setErrorMsg('');
    
    try {
      const compareInput: CompareInput = {
        jobTitle,
        jobDescription,
        candidates: validCandidates.map(c => ({
          id: c.id,
          candidateName: c.result!.candidateName,
          currentTitle: c.result!.currentTitle,
          recommendation: c.result!.recommendation as any,
          confidence: c.result!.confidence,
          summary: c.result!.summary,
          strengths: c.result!.strengths,
          concerns: c.result!.concerns,
          achievementScore: c.result!.achievementScore,
          aiRiskLevel: c.result!.aiRiskLevel as any
        }))
      };
      
      const res = await compareCandidates.mutateAsync({ data: compareInput });
      setResult(res);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || e.message || 'Failed to compare candidates.');
    }
  };

  if (validCandidates.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-muted-paper">
        <Layers size={32} className="mb-4 opacity-50" />
        <h3 className="font-serif text-[20px] text-ink mb-2">Compare Candidates</h3>
        <p className="text-[14px] text-center max-w-sm">
          Analyze at least two resumes to see how they stack up against each other for this role.
        </p>
      </div>
    );
  }

  if (!result && !compareCandidates.isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10">
        <Scale size={32} className="mb-6 text-indigo opacity-80" />
        <h3 className="font-serif text-[24px] text-ink mb-3 text-center">Rank {validCandidates.length} Candidates</h3>
        <p className="text-[14px] text-muted-dark text-center max-w-md mb-8">
          Candor will read all their profiles again, comparing their specific strengths and gaps against the requirements for {jobTitle || "this role"}.
        </p>
        <button
          onClick={handleCompare}
          className="px-6 py-3 bg-indigo text-white rounded-lg text-[14px] font-medium shadow-md hover:bg-indigo/90 transition-colors flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Medal size={16} /> Rank Candidates Now
        </button>
        {errorMsg && (
          <div className="mt-4 text-[13px] text-rose bg-rose/10 px-4 py-2 rounded-lg border border-rose/20 flex items-center gap-2 max-w-md">
            <AlertTriangle size={14} /> {errorMsg}
          </div>
        )}
      </div>
    );
  }

  if (compareCandidates.isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-indigo">
        <Loader2 size={32} className="animate-spin mb-6" />
        <p className="text-[15px] animate-pulse text-center max-w-sm">
          Cross-referencing {validCandidates.length} candidate profiles...
        </p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-line">
        <div>
          <h2 className="font-serif text-[28px] font-semibold text-ink m-0">Ranked Results</h2>
          <p className="text-[14px] text-muted-dark mt-1">Comparing {validCandidates.length} candidates for {jobTitle}</p>
        </div>
        <button
          onClick={handleCompare}
          className="px-4 py-2 bg-paper text-ink border border-line rounded-lg text-[13px] font-medium hover:bg-paper-2 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw size={14} /> Re-run Comparison
        </button>
      </div>

      <div className="space-y-6">
        {result.ranking.map((rankItem) => {
          const candidate = validCandidates.find(c => c.id === rankItem.id);
          if (!candidate || !candidate.result) return null;
          const r = candidate.result;
          
          return (
            <div key={rankItem.id} className="flex gap-6 bg-white border border-line rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5" 
                style={{ backgroundColor: rankItem.rank === 1 ? 'var(--color-emerald)' : rankItem.rank === 2 ? 'var(--color-indigo)' : 'var(--color-line)' }}
              />
              
              <div className="flex flex-col items-center shrink-0 w-16 pt-2 pl-2">
                <div className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center font-serif text-lg font-bold mb-3 border",
                  rankItem.rank === 1 ? "bg-emerald/10 text-emerald border-emerald/30" :
                  rankItem.rank === 2 ? "bg-indigo/10 text-indigo border-indigo/30" :
                  "bg-paper text-muted-dark border-line"
                )}>
                  #{rankItem.rank}
                </div>
                <VerdictStamp recommendation={r.recommendation} confidence={r.confidence} size="sm" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-[20px] font-semibold text-ink mb-1 truncate">{r.candidateName}</h3>
                <div className="text-[13px] text-muted-paper mb-4 truncate">{r.currentTitle}</div>
                
                <div className="bg-paper/50 rounded-lg p-4 mb-4 border border-line/50 text-[14px] leading-relaxed text-text-ink">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-dark mb-1">Comparative reasoning</div>
                  {rankItem.reason}
                </div>
                
                <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-line/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-paper">Achievement:</span>
                    <div className="w-24">
                      <ScoreMeter value={r.achievementScore} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-paper">AI Risk:</span>
                    <RiskBadge level={r.aiRiskLevel} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
