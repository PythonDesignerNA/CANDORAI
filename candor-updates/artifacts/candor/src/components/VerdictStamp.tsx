import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function VerdictStamp({ recommendation, confidence, size = 'md', className }: { recommendation: string, confidence: number, size?: 'sm' | 'md' | 'lg', className?: string }) {
  const styles = {
    Interview: 'border-emerald text-emerald bg-emerald-soft',
    Maybe: 'border-amber text-amber bg-amber-soft',
    Pass: 'border-rose text-rose bg-rose-soft',
  }[recommendation] || 'border-muted-paper text-muted-paper bg-paper-2';

  const sizeClasses = {
    sm: 'h-10 px-2.5 gap-2',
    md: 'h-12 px-3.5 gap-2.5',
    lg: 'h-16 px-5 gap-3',
  }[size];

  const labelClasses = {
    sm: 'text-[10.5px]',
    md: 'text-[12px]',
    lg: 'text-[14px]',
  }[size];

  const numClasses = {
    sm: 'text-[13px]',
    md: 'text-[16px]',
    lg: 'text-[21px]',
  }[size];

  return (
    <div className={twMerge(clsx(
      "inline-flex items-center justify-center rounded-lg border shrink-0",
      styles, sizeClasses, className
    ))}>
      <span className={clsx("font-sans font-semibold uppercase tracking-wide leading-none", labelClasses)}>
        {recommendation}
      </span>
      <span className="w-px h-[60%] bg-current opacity-25" />
      <span className={clsx("font-mono font-medium leading-none tabular-nums", numClasses)}>
        {confidence}%
      </span>
    </div>
  );
}
