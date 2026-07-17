import React, { useState } from 'react';
import { Loader2, Link2, UploadCloud, FileText, ChevronDown, Check } from 'lucide-react';
import { UseMutationResult } from '@tanstack/react-query';
import { JobImportInput, JobImportResult, ErrorResponse } from '@workspace/api-client-react';

interface JobSetupCardProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  isJobSet: boolean;
  setIsJobSet: (val: boolean) => void;
  importJobDesc: UseMutationResult<JobImportResult, unknown, { data: JobImportInput }, unknown>;
}

export function JobSetupCard({ jobTitle, setJobTitle, jobDescription, setJobDescription, isJobSet, setIsJobSet, importJobDesc }: JobSetupCardProps) {
  const [url, setUrl] = useState('');
  const [manual, setManual] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleImport = async () => {
    if (!url) return;
    setErrorMsg('');
    try {
      const res = await importJobDesc.mutateAsync({ data: { url } });
      if (res.jobTitle) setJobTitle(res.jobTitle);
      if (res.jobDescription) setJobDescription(res.jobDescription);
      setIsJobSet(true);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || e.message || 'Failed to import job description.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobTitle && jobDescription) {
      setIsJobSet(true);
    }
  };

  if (isJobSet) {
    return (
      <div className="bg-white border border-line rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-emerald mb-1">Active Role</div>
            <h3 className="font-serif font-semibold text-[18px] text-ink">{jobTitle}</h3>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald/10 text-emerald flex items-center justify-center shrink-0">
            <Check size={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-xl p-5 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-ink mb-1">Setup Role</h3>
      <p className="text-[13px] text-muted-dark mb-5">Import a job posting to calibrate the AI</p>

      {!manual ? (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1.5">Job Posting URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-paper" />
                <input 
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleImport()}
                  className="w-full pl-9 pr-3 py-2 bg-paper/50 border border-line rounded-lg text-[14px] outline-none focus:border-indigo focus:ring-1 focus:ring-indigo transition-all"
                />
              </div>
              <button 
                onClick={handleImport}
                disabled={!url || importJobDesc.isPending}
                className="px-4 py-2 bg-ink text-white rounded-lg text-[13px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {importJobDesc.isPending ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                Import
              </button>
            </div>
            {errorMsg && (
              <div className="mt-2 text-[12px] text-rose bg-rose/5 p-2 rounded border border-rose/10">
                {errorMsg}
              </div>
            )}
          </div>
          
          <div className="text-center">
            <button 
              onClick={() => setManual(true)}
              className="text-[12.5px] text-muted-paper hover:text-indigo transition-colors cursor-pointer"
            >
              or paste manually
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1.5">Job Title</label>
            <input 
              required
              type="text"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              className="w-full px-3 py-2 bg-paper/50 border border-line rounded-lg text-[14px] outline-none focus:border-indigo focus:ring-1 focus:ring-indigo transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1.5">Job Description</label>
            <textarea 
              required
              rows={4}
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              className="w-full px-3 py-2 bg-paper/50 border border-line rounded-lg text-[14px] outline-none focus:border-indigo focus:ring-1 focus:ring-indigo transition-all resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button 
              type="submit"
              disabled={!jobTitle || !jobDescription}
              className="flex-1 px-4 py-2 bg-ink text-white rounded-lg text-[13px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Set Role
            </button>
            <button 
              type="button"
              onClick={() => setManual(false)}
              className="px-4 py-2 border border-line text-ink rounded-lg text-[13px] font-medium hover:bg-paper-2 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
