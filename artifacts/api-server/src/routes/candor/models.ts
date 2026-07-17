import { Router } from "express";

const router = Router();

// Temporary diagnostic: lists models available to this API key
router.get("/models", async (req, res) => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) { res.status(503).json({ error: "GEMINI_API_KEY not set" }); return; }
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
    );
    const data = await r.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const names = (data.models ?? [])
      .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
      .map(m => m.name);
    res.json({ available: names });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
