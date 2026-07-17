import { Router } from "express";
import { analyzeResume, GeminiNotConfiguredError } from "./gemini";

const router = Router();

router.post("/analyze", async (req, res) => {
  const { resumeBase64, jobTitle, jobDescription } = req.body as {
    resumeBase64?: string;
    jobTitle?: string | null;
    jobDescription?: string;
  };

  if (!resumeBase64 || !jobDescription) {
    res.status(400).json({ error: "resumeBase64 and jobDescription are required" });
    return;
  }

  try {
    const result = await analyzeResume(resumeBase64, jobTitle ?? null, jobDescription);
    res.json(result);
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      res.status(503).json({ error: e.message, code: e.code });
      return;
    }
    req.log.error({ err: e }, "Resume analysis failed");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
