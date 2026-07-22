/**
 * Gemini client helpers for Candor.
 *
 * All AI calls are routed through this module so the key-absent check lives
 * in one place. When GEMINI_API_KEY is not set the helpers throw a typed
 * error that the route handlers convert into a 503.
 */

export class GeminiNotConfiguredError extends Error {
  code = "AI_NOT_CONFIGURED" as const;
  constructor() {
    super(
      "Gemini API key is not yet configured. Add GEMINI_API_KEY to the environment and restart the server."
    );
    this.name = "GeminiNotConfiguredError";
  }
}

const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new GeminiNotConfiguredError();
  return key;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiConfig {
  maxOutputTokens?: number;
  responseMimeType?: string;
}

interface GeminiTool {
  google_search?: Record<string, never>;
}

async function callGemini(
  system: string,
  contents: GeminiContent[],
  opts: { tools?: GeminiTool[]; expectJson?: boolean } = {}
): Promise<string> {
  const apiKey = getApiKey();
  const { tools, expectJson = true } = opts;

  // Keep dev-mode behavior aligned with the deployed Netlify function so
  // slowness isn't only discovered in production. See netlify/functions/lib/gemini.ts
  // for why this is 2 short attempts rather than 5 long ones.
  const maxAttempts = 2;
  const perAttemptTimeoutMs = 11_000;
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const config: GeminiConfig = { maxOutputTokens: 1200 };
    if (expectJson && !tools) config.responseMimeType = "application/json";

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: config,
    };
    if (tools) body["tools"] = tools;

    const resp = await fetch(
      `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Hard cap per attempt — keeps us well inside the reverse-proxy timeout.
        // Retries (on 429 / 5xx) each get their own fresh 26 s window.
        signal: AbortSignal.timeout(perAttemptTimeoutMs),
      }
    );

    if (!resp.ok) {
      let detail = resp.statusText;
      try {
        const errBody = await resp.json() as { error?: { message?: string } };
        detail = errBody?.error?.message ?? detail;
      } catch (_) { /* ignore */ }

      // 429 with "limit: 0" means zero quota — retrying will never help
      const isHardQuotaZero = resp.status === 429 && /limit:\s*0/i.test(detail);
      const retryable = !isHardQuotaZero && (resp.status === 429 || resp.status >= 500);
      const err = Object.assign(new Error(`${resp.status}: ${detail}`), { retryable });
      lastError = err;
      if (!retryable || attempt === maxAttempts) throw err;
      await sleep(500);
      continue;
    }

    const data = await resp.json() as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION") {
      throw new Error(`Gemini declined to respond (${candidate.finishReason.toLowerCase()})`);
    }

    const text = (candidate?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("\n")
      .trim();

    if (!text) throw new Error("Gemini returned an empty response");
    return text;
  }

  throw lastError;
}

// ---------- public helpers ----------

export async function analyzeResume(
  resumeBase64: string,
  jobTitle: string | null,
  jobDescription: string
): Promise<unknown> {
  const SYSTEM = `You are a senior recruiter with 15 years of experience across many industries. Your guiding question is always: "Would a good recruiter interview this person?" — never a keyword scanner. You weigh trajectory, transferable skills, and real-world impact over literal keyword overlap. You are open-minded about non-traditional paths, career gaps, and unconventional formatting.

Rules:
- Only recommend "Pass" for a genuine fundamental mismatch in role, level, or domain — never for a fixable or soft concern.
- Among "strengths", include at least one genuine strength the job description did not explicitly ask for.
- "achievementScore" rates how much measurable change/impact the candidate actually drove versus just listing duties.
- "aiRiskLevel" is your honest heuristic judgment of whether the resume reads as AI-generated or heavily templated.
- "questions" must be specific to THIS candidate's actual background and THIS role — never generic.
- Keep every field concise. Total output must stay well under 700 words.

Respond with ONLY valid JSON matching exactly this schema:
{
  "candidateName": string,
  "currentTitle": string,
  "recommendation": "Interview" | "Maybe" | "Pass",
  "confidence": number (0-100),
  "summary": string (1-2 sentences),
  "strengths": [ { "title": string, "detail": string } ] (3-5 items),
  "concerns": [ { "title": string, "detail": string } ] (1-4 items),
  "achievementScore": number (0-100),
  "achievementNote": string (1-2 sentences),
  "aiRiskLevel": "Low" | "Medium" | "High",
  "aiRiskNote": string (1 sentence),
  "questions": [string] (4-6 items)
}`;

  const text = await callGemini(SYSTEM, [
    {
      role: "user",
      parts: [
        { inline_data: { mime_type: "application/pdf", data: resumeBase64 } },
        {
          text: `JOB TITLE: ${jobTitle ?? "Not specified"}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nAnalyze the attached resume for this role. Respond only with the JSON schema described in your instructions.`,
        },
      ],
    },
  ]);

  return JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
}

export async function compareCandidates(
  jobTitle: string | null,
  jobDescription: string,
  candidates: unknown[]
): Promise<unknown> {
  const SYSTEM = `You are a senior recruiter who has already individually assessed several candidates for the same open role. Now rank them against EACH OTHER for this specific role. Your reasoning must be comparative — explain why one candidate ranks above another, not just restate their individual summary. Be open-minded and holistic, not keyword-driven.

Respond with ONLY valid JSON:
{ "ranking": [ { "id": string, "rank": number, "reason": string (1-2 sentences, comparative) } ] }`;

  const text = await callGemini(SYSTEM, [
    {
      role: "user",
      parts: [
        {
          text: `JOB TITLE: ${jobTitle ?? "Not specified"}\nJOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE ASSESSMENTS:\n${JSON.stringify(candidates)}\n\nRank these candidates for this role, comparing them to each other. Respond only with the JSON schema described in your instructions.`,
        },
      ],
    },
  ]);

  return JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
}

export async function importJobFromUrl(url: string): Promise<{ jobTitle: string | null; jobDescription: string }> {
  const SYSTEM = `You extract job posting details. Find the job title and the core responsibilities, requirements, and qualifications. Write them in your own words as clean plain text (not JSON, no markdown headers) under 400 words — omit company boilerplate, legal/EEO text, and benefits fluff. Start the first line with the job title only. If you cannot find or access the posting, respond with exactly: FETCH_FAILED`;

  // First: try to fetch the page ourselves server-side, then pass the text to Gemini
  let pageText = "";
  try {
    const pageResp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CandorBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      // Strip HTML tags to get readable text
      pageText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{3,}/g, "\n")
        .trim()
        .slice(0, 8000); // keep under Gemini inline limit
    }
  } catch (_) {
    // If we can't fetch the page, fall back to asking Gemini with just the URL
  }

  const userMessage = pageText
    ? `Extract the job description from this page content (URL: ${url}):\n\n${pageText}`
    : `URL: ${url}\nPlease find and extract the job description from this URL using your knowledge or search.`;

  const text = await callGemini(
    SYSTEM,
    [{ role: "user", parts: [{ text: userMessage }] }],
    { tools: pageText ? undefined : [{ google_search: {} }], expectJson: false }
  );

  const trimmed = text.trim();
  if (!trimmed || trimmed === "FETCH_FAILED") {
    throw new Error("FETCH_FAILED");
  }

  const lines = trimmed.split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  if (firstLine && firstLine.length < 120) {
    return {
      jobTitle: firstLine,
      jobDescription: lines.slice(1).join("\n").trim(),
    };
  }

  return { jobTitle: null, jobDescription: trimmed };
}
