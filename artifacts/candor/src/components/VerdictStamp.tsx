import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function VerdictStamp({ recommendation, confidence, size = 'md', className }: { recommendation: string, confidence: number, size?: 'sm' | 'md' | 'lg', className?: string }) {
  const styles = {
    Interview: 'border-emerald text-emerald bg-emerald-soft',
    Maybe: 'border-amber text-amber bg-amber-soft',
    Pass: 'border-rose text-rose bg-rose-soft',
  }[recommendation] || 'border-muted-paper text-muted-paper bg-paper';

  const sizeClasses = {
    sm: 'w-12 h-12 border-2',
    md: 'w-[76px] h-[76px] border-2',
    lg: 'w-[108px] h-[108px] border-[3px]',
  }[size];

  const fontClasses = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-[15px]',
  }[size];

  const subClasses = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-[13px]',
  }[size];

  return (
    <div className={twMerge(clsx(
      "inline-flex flex-col items-center justify-center -rotate-[5deg] rounded-full border-double shrink-0",
      styles, sizeClasses, className
    ))}>
      <span className={clsx("font-serif font-bold uppercase tracking-wider leading-tight text-center", fontClasses)}>
        {recommendation}
      </span>
      <span className={clsx("font-mono mt-[2px] opacity-85", subClasses)}>
        {confidence}%
      </span>
    </div>
  );
}
