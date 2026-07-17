import React from 'react';

export function ScoreMeter({ value }: { value: number }) {
  const color = 'var(--color-indigo)';
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-xs text-indigo min-w-[30px] text-right">
        {value}
      </span>
    </div>
  );
}
