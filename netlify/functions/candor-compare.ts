import { compareCandidates, GeminiNotConfiguredError } from "./lib/gemini";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const handler = async (event: {
  httpMethod: string;
  body: string | null;
}) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body: {
    jobTitle?: string | null;
    jobDescription?: string;
    candidates?: unknown[];
  };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!body.jobDescription || !Array.isArray(body.candidates) || body.candidates.length < 2) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: "jobDescription and at least 2 candidates are required",
      }),
    };
  }

  try {
    const result = await compareCandidates(
      body.jobTitle ?? null,
      body.jobDescription,
      body.candidates
    );
    return { statusCode: 200, headers: CORS, body: JSON.stringify(result) };
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      return {
        statusCode: 503,
        headers: CORS,
        body: JSON.stringify({ error: e.message, code: e.code }),
      };
    }
    console.error("compare error:", e);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Comparison failed. Please try again." }),
    };
  }
};
