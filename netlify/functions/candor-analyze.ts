import { analyzeResume, GeminiNotConfiguredError } from "./lib/gemini";

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
    resumeBase64?: string;
    jobTitle?: string | null;
    jobDescription?: string;
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

  if (!body.resumeBase64 || !body.jobDescription) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({
        error: "resumeBase64 and jobDescription are required",
      }),
    };
  }

  try {
    const result = await analyzeResume(
      body.resumeBase64,
      body.jobTitle ?? null,
      body.jobDescription
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
    console.error("analyze error:", e);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Analysis failed. Please try again." }),
    };
  }
};
