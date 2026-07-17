import React, { useState, useRef } from 'react';
import { useCandor } from '../hooks/use-candor';
import { Hero } from '../components/Hero';
import { JobSetupCard } from '../components/JobSetupCard';
import { CandidateCard } from '../components/CandidateCard';
import { CandidateDetail } from '../components/CandidateDetail';
import { CompareView } from '../components/CompareView';
import { GeminiInfo } from '../components/GeminiInfo';
import { Upload, RotateCcw, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function CandorApp() {
  const {
    candidates,
    jobTitle, setJobTitle,
    jobDescription, setJobDescription,
    isJobSet, setIsJobSet,
    addCandidates, retryCandidate, removeCandidate, resetRole,
    compareCandidates
  } = useCandor();

  const [activeTab, setActiveTab] = useState<'analyze' | 'compare'>('analyze');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isJobSet) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isJobSet) return;
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length > 0) {
      addCandidates(files.slice(0, 25)); // Max 25
      if (!selectedId) setSelectedId(candidates.length > 0 ? candidates[0].id : null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (files.length > 0) {
        addCandidates(files.slice(0, 25));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeCandidate = candidates.find(c => c.id === selectedId);
  const hasCandidates = candidates.length > 0;
  
  // Show banner if AI is not configured
  const aiNotConfigured = candidates.some(c => c.note === 'AI_NOT_CONFIGURED');

  return (
    <div className="min-h-[100dvh] bg-paper-2 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-line px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="font-serif font-bold text-xl tracking-tight text-ink flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-ink text-paper flex items-center justify-center text-sm">C</span>
            Candor
          </div>
          
          {hasCandidates && (
            <div className="flex bg-line/30 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('analyze')}
                className={clsx(
                  "px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                  activeTab === 'analyze' ? "bg-white shadow-sm text-ink" : "text-muted-dark hover:text-ink"
                )}
              >
                Analyze
              </button>
              <button 
                onClick={() => setActiveTab('compare')}
                className={clsx(
                  "px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                  activeTab === 'compare' ? "bg-white shadow-sm text-ink" : "text-muted-dark hover:text-ink"
                )}
              >
                Compare {candidates.filter(c => c.status === 'success').length >= 2 ? `(${candidates.filter(c => c.status === 'success').length})` : ''}
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <GeminiInfo />
          {hasCandidates && (
            <button 
              onClick={resetRole}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-rose hover:bg-rose/10 rounded-lg transition-colors border border-transparent hover:border-rose/20 cursor-pointer"
            >
              <RotateCcw size={14} /> New Role
            </button>
          )}
        </div>
      </header>

      {/* AI Not Configured Banner */}
      {aiNotConfigured && (
        <div className="bg-amber-soft border-b border-amber/30 px-6 py-2.5 flex items-center justify-center gap-2 text-amber text-sm font-medium">
          <AlertCircle size={16} />
          Gemini API key not yet configured — AI analysis coming soon.
        </div>
      )}

      {/* Main Content */}
      {!hasCandidates ? (
        <main className="flex-1 max-w-[1200px] w-full mx-auto pb-20">
          <Hero />
          <div className="max-w-2xl mx-auto mt-12 px-6">
            <JobSetupCard 
              jobTitle={jobTitle} setJobTitle={setJobTitle}
              jobDescription={jobDescription} setJobDescription={setJobDescription}
              isJobSet={isJobSet} setIsJobSet={setIsJobSet}
            />
            {isJobSet && (
              <div 
                className={clsx(
                  "mt-8 p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white/50 backdrop-blur-sm",
                  isDragging ? "border-indigo bg-indigo/5 scale-[1.01]" : "border-line hover:border-indigo/50 hover:bg-indigo/5"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-indigo/10 flex items-center justify-center text-indigo mb-4">
                  <Upload size={28} />
                </div>
                <h3 className="font-serif text-xl font-semibold text-ink mb-2">Drop candidate resumes here</h3>
                <p className="text-muted-dark text-sm max-w-sm">Upload up to 25 PDF resumes at once. Candor will analyze them against the role requirements.</p>
                <input type="file" multiple accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
              </div>
            )}
          </div>
        </main>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-[320px] shrink-0 border-r border-line bg-paper/50 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-line shrink-0 space-y-4">
              <JobSetupCard 
                jobTitle={jobTitle} setJobTitle={setJobTitle}
                jobDescription={jobDescription} setJobDescription={setJobDescription}
                isJobSet={isJobSet} setIsJobSet={setIsJobSet}
              />
              
              {isJobSet && (
                <div 
                  className={clsx(
                    "p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white",
                    isDragging ? "border-indigo bg-indigo/5" : "border-line hover:border-indigo/50 hover:bg-indigo/5"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="text-indigo mb-2" />
                  <p className="font-medium text-ink text-[13px] mb-0.5">Upload more resumes</p>
                  <p className="text-[11px] text-muted-paper">PDF only, max 25</p>
                  <input type="file" multiple accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-paper px-1 pt-1 pb-2">
                Candidates ({candidates.length})
              </div>
              {candidates.map(c => (
                <CandidateCard 
                  key={c.id} 
                  candidate={c} 
                  selected={selectedId === c.id && activeTab === 'analyze'}
                  onClick={() => { setSelectedId(c.id); setActiveTab('analyze'); }}
                  onRetry={() => retryCandidate(c.id)}
                  onRemove={() => removeCandidate(c.id)}
                />
              ))}
            </div>
          </aside>

          {/* Right Panel */}
          <main className="flex-1 overflow-y-auto p-8 lg:p-12 bg-white">
            {activeTab === 'analyze' ? (
              activeCandidate ? (
                <CandidateDetail candidate={activeCandidate} jobTitle={jobTitle} jobDescription={jobDescription} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-paper">
                  <p className="text-[15px]">Select a candidate to view their analysis</p>
                </div>
              )
            ) : (
              <CompareView 
                candidates={candidates} 
                jobTitle={jobTitle} 
                jobDescription={jobDescription} 
                compareCandidates={compareCandidates} 
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
