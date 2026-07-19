import React from 'react';
import { useAnalyzeResume, useCompareCandidates, CandidateResult } from '@workspace/api-client-react';

export interface Candidate {
  id: string;
  file: File;
  fileName: string;
  status: 'queued' | 'analyzing' | 'error' | 'success';
  error?: string;
  note?: string;
  result?: CandidateResult;
}

// ─── Concurrency limiter ──────────────────────────────────────────────────────
// Caps how many Gemini calls run at once.  Uploading 10 PDFs at once would
// previously flood both the Express server and the Gemini API, making
// timeouts (and therefore 502s) far more likely.
const MAX_CONCURRENT = 3;

function makeLimiter(max: number) {
  let running = 0;
  const waiting: Array<() => void> = [];
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (running >= max) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    running++;
    try {
      return await fn();
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}

const limiter = makeLimiter(MAX_CONCURRENT);

// ─── Retry helper ─────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

const MAX_RETRIES = 2;

function isRetryable(err: unknown): boolean {
  // Never retry a misconfigured-key error — it won't fix itself
  if ((err as any)?.response?.data?.code === 'AI_NOT_CONFIGURED') return false;
  const status: number | undefined =
    (err as any)?.response?.status ?? (err as any)?.status;
  // Retry gateway errors
  if (status !== undefined) return status === 502 || status === 503 || status === 504;
  // TypeError / AbortError = network-level failure (proxy cut the connection)
  return err instanceof TypeError || (err as any)?.name === 'AbortError';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCandor() {
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [jobTitle, setJobTitle] = React.useState<string>('');
  const [jobDescription, setJobDescription] = React.useState<string>('');
  const [isJobSet, setIsJobSet] = React.useState(false);

  const analyzeResume = useAnalyzeResume();
  const compareCandidates = useCompareCandidates();

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const processCandidate = async (
    id: string,
    file: File,
    jt: string,
    jd: string,
  ) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: 'analyzing', error: undefined } : c,
      ),
    );

    await limiter(async () => {
      let attempt = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const base64 = await readFileAsBase64(file);
          const result = await analyzeResume.mutateAsync({
            data: { resumeBase64: base64, jobTitle: jt, jobDescription: jd },
          });
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, status: 'success', result } : c,
            ),
          );
          return;
        } catch (err: unknown) {
          if (attempt < MAX_RETRIES && isRetryable(err)) {
            attempt++;
            // Exponential back-off: 1 s then 2 s — keeps the UI feeling alive
            await sleep(1000 * attempt);
            continue;
          }

          const errorMsg =
            (err as any)?.response?.data?.error ??
            (err as any)?.message ??
            'Failed to analyze resume.';
          const isNotConfigured =
            (err as any)?.response?.data?.code === 'AI_NOT_CONFIGURED';

          setCandidates((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    status: 'error',
                    error: errorMsg,
                    note: isNotConfigured ? 'AI_NOT_CONFIGURED' : undefined,
                  }
                : c,
            ),
          );
          return;
        }
      }
    });
  };

  const addCandidates = (files: File[]) => {
    // Snapshot job values now — so retries that happen later use the same
    // description that was active when the files were dropped.
    const jt = jobTitle;
    const jd = jobDescription;

    const newCandidates = files.map((file) => ({
      id: Math.random().toString(36).slice(2, 10),
      file,
      fileName: file.name,
      status: 'queued' as const,
    }));
    setCandidates((prev) => [...prev, ...newCandidates]);
    // Fire all candidates; the limiter caps actual concurrency at MAX_CONCURRENT
    newCandidates.forEach((c) => processCandidate(c.id, c.file, jt, jd));
  };

  const retryCandidate = (id: string) => {
    const c = candidates.find((c) => c.id === id);
    if (c) processCandidate(id, c.file, jobTitle, jobDescription);
  };

  const removeCandidate = (id: string) =>
    setCandidates((prev) => prev.filter((c) => c.id !== id));

  const resetRole = () => {
    setCandidates([]);
    setJobTitle('');
    setJobDescription('');
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
  };
}
