import React from 'react';
import { Check } from 'lucide-react';

interface JobSetupCardProps {
  jobTitle: string;
  setJobTitle: (val: string) => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  isJobSet: boolean;
  setIsJobSet: (val: boolean) => void;
}

export function JobSetupCard({ jobTitle, setJobTitle, jobDescription, setJobDescription, isJobSet, setIsJobSet }: JobSetupCardProps) {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobTitle.trim() && jobDescription.trim()) {
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
        <button
          onClick={() => setIsJobSet(false)}
          className="mt-3 text-[12px] text-muted-paper hover:text-indigo transition-colors cursor-pointer"
        >
          Edit role
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-xl p-5 shadow-sm">
      <h3 className="font-serif font-semibold text-[18px] text-ink mb-1">Setup Role</h3>
      <p className="text-[13px] text-muted-dark mb-5">Describe the role you are hiring for</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Job Title</label>
          <input
            required
            type="text"
            placeholder="e.g. Senior Product Manager"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className="w-full px-3 py-2 bg-paper/50 border border-line rounded-lg text-[14px] outline-none focus:border-indigo focus:ring-1 focus:ring-indigo transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Role Description</label>
          <textarea
            required
            rows={5}
            placeholder="Paste or type the key responsibilities, requirements, and what success looks like in this role..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            className="w-full px-3 py-2 bg-paper/50 border border-line rounded-lg text-[14px] outline-none focus:border-indigo focus:ring-1 focus:ring-indigo transition-all resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={!jobTitle.trim() || !jobDescription.trim()}
          className="w-full px-4 py-2 bg-ink text-white rounded-lg text-[13px] font-medium hover:bg-ink-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Set Role
        </button>
      </form>
    </div>
  );
}
