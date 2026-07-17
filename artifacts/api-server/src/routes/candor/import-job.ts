import { Router } from "express";
import { importJobFromUrl, GeminiNotConfiguredError } from "./gemini";

const router = Router();

router.post("/import-job", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || !url.trim()) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // Basic URL sanity check
  try {
    const parsed = new URL(url.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "Only http:// and https:// URLs are supported" });
      return;
    }
  } catch (_) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const result = await importJobFromUrl(url.trim());
    res.json(result);
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      res.status(503).json({ error: e.message, code: e.code });
      return;
    }
    const msg = (e as Error).message;
    if (msg === "FETCH_FAILED") {
      res.status(400).json({ error: "Couldn't read that page — paste the description in manually instead." });
      return;
    }
    req.log.error({ err: e }, "Job import failed");
    res.status(500).json({ error: "Couldn't import that link — paste the description in manually instead." });
  }
});

export default router;
