import { Router } from "express";
import { compareCandidates, GeminiNotConfiguredError } from "./gemini";

const router = Router();

router.post("/compare", async (req, res) => {
  const { jobTitle, jobDescription, candidates } = req.body as {
    jobTitle?: string | null;
    jobDescription?: string;
    candidates?: unknown[];
  };

  if (!jobDescription || !Array.isArray(candidates) || candidates.length < 2) {
    res.status(400).json({ error: "jobDescription and at least 2 candidates are required" });
    return;
  }

  try {
    const result = await compareCandidates(jobTitle ?? null, jobDescription, candidates);
    res.json(result);
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      res.status(503).json({ error: e.message, code: e.code });
      return;
    }
    req.log.error({ err: e }, "Candidate comparison failed");
    res.status(500).json({ error: "Comparison failed. Please try again." });
  }
});

export default router;
