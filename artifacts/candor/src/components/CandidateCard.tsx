import React from 'react';
import { Loader2, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { VerdictStamp } from './VerdictStamp';
import { RiskBadge } from './RiskBadge';
import { Candidate } from '../hooks/use-candor';
import { clsx } from 'clsx';

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onClick: () => void;
  onRetry: () => void;
  onRemove: () => void;
}

export function CandidateCard({ candidate, selected, onClick, onRetry, onRemove }: CandidateCardProps) {
  const { status, fileName, result, error } = candidate;

  return (
    <div 
      onClick={onClick}
      className={clsx(
        "group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border text-left w-full",
        selected ? "bg-white border-line shadow-sm" : "border-transparent hover:bg-white/50"
      )}
    >
      {status === 'queued' || status === 'analyzing' ? (
        <div className="w-[42px] h-[42px] flex items-center justify-center shrink-0 border border-line rounded-full bg-paper/50">
          <Loader2 size={16} className="text-muted-paper animate-spin" />
        </div>
      ) : status === 'error' ? (
        <div className="w-[42px] h-[42px] flex items-center justify-center shrink-0 border border-rose/30 rounded-full bg-rose/10 text-rose">
          <AlertTriangle size={16} />
        </div>
      ) : result ? (
        <VerdictStamp recommendation={result.recommendation} confidence={result.confidence} size="sm" />
      ) : null}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-serif font-semibold text-ink text-[15px] truncate pt-1">
            {result?.candidateName || fileName}
          </h4>
        </div>
        
        {status === 'queued' ? (
          <p className="text-[12px] text-muted-paper mt-1">Queued...</p>
        ) : status === 'analyzing' ? (
          <p className="text-[12px] text-indigo mt-1 animate-pulse">Analyzing...</p>
        ) : status === 'error' ? (
          <div className="mt-1">
            <p className="text-[12px] text-rose line-clamp-2 leading-tight">{error}</p>
            <button 
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-ink hover:text-indigo"
            >
              <RotateCcw size={10} /> Retry
            </button>
          </div>
        ) : result ? (
          <div className="mt-1 space-y-2">
            <p className="text-[12px] text-muted-paper truncate">{result.currentTitle}</p>
            <RiskBadge level={result.aiRiskLevel} />
          </div>
        ) : null}
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-2 top-2 p-1.5 text-muted-paper hover:text-rose hover:bg-rose/10 rounded opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
