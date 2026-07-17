import { Router } from "express";

const router = Router();

router.get("/test-model", async (req, res) => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) { res.status(503).json({ error: "GEMINI_API_KEY not set" }); return; }

  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
  ];

  const results: Record<string, string> = {};

  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Reply with just the word OK" }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
          signal: AbortSignal.timeout(8000),
        }
      );
      const data = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      if (r.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "ok";
        results[model] = `✅ ${r.status} — "${text.trim()}"`;
      } else {
        const err = data as unknown as { error?: { message?: string } };
        results[model] = `❌ ${r.status} — ${(err as any).error?.message?.slice(0, 80)}`;
      }
    } catch (e) {
      results[model] = `💥 ${String(e).slice(0, 80)}`;
    }
  }

  res.json(results);
});

export default router;
