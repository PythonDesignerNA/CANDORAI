import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export function GeminiInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium text-muted-paper hover:bg-black/5 hover:text-ink transition-colors cursor-pointer"
      >
        <span className="flex items-center justify-center w-3 h-3 rounded-full bg-violet/20">
          <span className="w-1.5 h-1.5 rounded-full bg-violet" />
        </span>
        Powered by Gemini
        <Info size={13} className="ml-0.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 p-4 bg-paper border border-line shadow-xl rounded-lg z-50 animate-in fade-in slide-in-from-top-2">
          <div className="text-[14px] text-ink font-medium mb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet" />
            Gemini 2.5 Flash
          </div>
          <p className="text-[13px] text-muted-paper leading-relaxed m-0">
            All analysis runs on Google's Gemini models. The API key is securely managed server-side.
          </p>
        </div>
      )}
    </div>
  );
}
