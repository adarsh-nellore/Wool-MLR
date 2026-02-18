import type { Express } from "express";
import { requireAuth, getUserId, type AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { analyzeContentSchema } from "@shared/schema";
import { analyzeContent } from "../services/analysisService";

export function registerAnalysisRoutes(app: Express): void {
  app.post("/api/analyze", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const parsed = analyzeContentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      }

      const { profileId, content } = parsed.data;

      // Verify profile ownership
      const profile = await storage.getProfileById(profileId);
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      if (profile.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      // Load claims and rules
      const claims = await storage.getClaimsByProfileId(profileId);
      const rules = await storage.getRulesByProfileId(profileId);

      // Run analysis
      const result = await analyzeContent(profile, claims, rules, content);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing content:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });
}
