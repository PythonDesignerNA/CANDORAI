import React from 'react';
import { useAnalyzeResume, useCompareCandidates, useImportJobDescription, CandidateResult, CompareResult, JobImportResult, CandidateSummary } from '@workspace/api-client-react';

export interface Candidate {
  id: string;
  file: File;
  fileName: string;
  status: 'queued' | 'analyzing' | 'error' | 'success';
  error?: string;
  note?: string;
  result?: CandidateResult;
}

export function useCandor() {
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [jobTitle, setJobTitle] = React.useState<string>("");
  const [jobDescription, setJobDescription] = React.useState<string>("");
  const [isJobSet, setIsJobSet] = React.useState(false);
  
  const analyzeResume = useAnalyzeResume();
  const compareCandidates = useCompareCandidates();
  const importJobDesc = useImportJobDescription();

  // Helper to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // extract the base64 part
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const addCandidates = (files: File[]) => {
    const newCandidates = files.map(file => ({
      id: Math.random().toString(36).slice(2, 10),
      file,
      fileName: file.name,
      status: 'queued' as const,
    }));
    setCandidates(prev => [...prev, ...newCandidates]);
    
    // Process them asynchronously
    newCandidates.forEach(c => processCandidate(c.id, c.file));
  };

  const processCandidate = async (id: string, file: File) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: 'analyzing' } : c));
    try {
      const base64 = await readFileAsBase64(file);
      const result = await analyzeResume.mutateAsync({
        data: {
          resumeBase64: base64,
          jobTitle,
          jobDescription
        }
      });
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: 'success', result } : c));
    } catch (err: any) {
      // Handle the AI_NOT_CONFIGURED error natively
      const errorMsg = err?.response?.data?.error || err.message || "Failed to analyze resume.";
      const isNotConfigured = err?.response?.data?.code === "AI_NOT_CONFIGURED";
      setCandidates(prev => prev.map(c => c.id === id ? { 
        ...c, 
        status: 'error', 
        error: errorMsg,
        note: isNotConfigured ? 'AI_NOT_CONFIGURED' : undefined
      } : c));
    }
  };

  const retryCandidate = (id: string) => {
    const c = candidates.find(c => c.id === id);
    if (c) processCandidate(id, c.file);
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const resetRole = () => {
    setCandidates([]);
    setJobTitle("");
    setJobDescription("");
    setIsJobSet(false);
  };

  return {
    candidates,
    jobTitle,
    setJobTitle,
    jobDescription,
    setJobDescription,
    isJobSet,
    setIsJobSet,
    addCandidates,
    retryCandidate,
    removeCandidate,
    resetRole,
    analyzeResume,
    compareCandidates,
    importJobDesc
  };
}