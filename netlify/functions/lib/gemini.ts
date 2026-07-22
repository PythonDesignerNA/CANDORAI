/**
 * Self-contained Gemini client for Netlify Functions.
 * No workspace dependencies — plain Node fetch.
 */

export class GeminiNotConfiguredError extends Error {
  code = "AI_NOT_CONFIGURED" as const;
  constructor() {
    super("GEMINI_API_KEY is not configured on this deployment.");
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

async function callGemini(
  system: string,
  contents: GeminiContent[],
  expectJson = true
): Promise<string> {
  const apiKey = getApiKey();
  const maxAttempts = 5;
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
        ...(expectJson ? { responseMimeType: "application/json" } : {}),
      },
    };

    const resp = await fetch(
      `${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(55_000), // Netlify Functions timeout is 60s
      }
    );

    if (!resp.ok) {
      let detail = resp.statusText;
      try {
        const errBody = (await resp.json()) as { error?: { message?: string } };
        detail = errBody?.error?.message ?? detail;
      } catch (_) {
        /* ignore */
      }

      const isHardQuotaZero = resp.status === 429 && /limit:\s*0/i.test(detail);
      const retryable =
        !isHardQuotaZero && (resp.status === 429 || resp.status >= 500);
      lastError = Object.assign(new Error(`${resp.status}: ${detail}`), {
        retryable,
      });
      if (!retryable || attempt === maxAttempts) throw lastError;
      await sleep(Math.min(1000 * Math.pow(2, attempt - 1), 16_000));
      continue;
    }

    const data = (await resp.json()) as {
      candidates?: Array<{
        finishReason?: string;
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const candidate = data.candidates?.[0];
    if (
      candidate?.finishReason === "SAFETY" ||
      candidate?.finishReason === "RECITATION"
    ) {
      throw new Error(
        `Gemini declined to respond (${candidate.finishReason.toLowerCase()})`
      );
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

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function analyzeResume(
  resumeBase64: string,
  jobTitle: string | null,
  jobDescription: string
): Promise<unknown> {
  const SYSTEM = `You are a senior recruiter with 15 years of experience across many industries. Your guiding question is always: "Would a good recruiter interview this person?" — never a keyword scanner. You weigh trajectory, transferable skills, and real-world impact over literal keyword overlap. You are open-minded about non-traditional paths, career gaps, and unconventional formatting.

Rules:
- Only recommend "Pass" for a genuine fundamental mismatch in role, level, or domain.
- Among "strengths", include at least one genuine strength the job description did not explicitly ask for.
- "achievementScore" rates measurable change/impact the candidate actually drove versus listing duties.
- "aiRiskLevel" is your honest judgment of whether the resume reads as AI-generated or heavily templated.
- "questions" must be specific to THIS candidate and THIS role.
- Keep every field concise. Total output must stay under 700 words.

Respond with ONLY valid JSON:
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
          text: `JOB TITLE: ${jobTitle ?? "Not specified"}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nAnalyze the attached resume for this role. Respond only with the JSON schema described.`,
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
  const SYSTEM = `You are a senior recruiter ranking candidates against each other for the same role. Your reasoning must be comparative — explain why one ranks above another, not just restate individual summaries.

Respond with ONLY valid JSON:
{ "ranking": [ { "id": string, "rank": number, "reason": string (1-2 sentences, comparative) } ] }`;

  const text = await callGemini(SYSTEM, [
    {
      role: "user",
      parts: [
        {
          text: `JOB TITLE: ${jobTitle ?? "Not specified"}\nJOB DESCRIPTION:\n${jobDescription}\n\nCANDIDATE ASSESSMENTS:\n${JSON.stringify(candidates)}\n\nRank these candidates comparatively.`,
        },
      ],
    },
  ]);

  return JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
}
