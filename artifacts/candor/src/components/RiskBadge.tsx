import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';

export function RiskBadge({ level, className }: { level: string, className?: string }) {
  const c = {
    Low: 'text-emerald border-emerald/30 bg-emerald/10',
    Medium: 'text-amber border-amber/30 bg-amber/10',
    High: 'text-rose border-rose/30 bg-rose/10',
  }[level] || 'text-muted-paper border-muted-paper/30 bg-muted-paper/10';

  return (
    <span className={clsx("inline-flex items-center gap-[5px] font-mono text-[11px] px-2 py-[3px] rounded-full whitespace-nowrap border", c, className)}>
      <ShieldAlert size={11} /> AI-RISK: {level?.toUpperCase()}
    </span>
  );
}
