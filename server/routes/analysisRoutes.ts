import type { Express, Request } from "express";
import { storage } from "../storage";
import { analyzeContentSchema } from "@shared/schema";
import { analyzeContent } from "../services/analysisService";

export function registerAnalysisRoutes(app: Express): void {
  app.post("/api/analyze", async (req: Request, res) => {
    try {
      const userId = (req as any).user?.claims?.sub || "dev-user";

      const parsed = analyzeContentSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("[analyze route] Validation failed:", parsed.error.errors);
        return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      }

      const { profileId, content } = parsed.data;
      console.log(`[analyze route] profileId=${profileId}, content length=${content.length}, userId=${userId}`);

      // Verify profile ownership
      const profile = await storage.getProfileById(profileId);
      if (!profile) {
        console.error(`[analyze route] Profile ${profileId} not found`);
        return res.status(404).json({ error: "Profile not found" });
      }
      if (profile.userId !== userId) {
        console.error(`[analyze route] Profile ${profileId} belongs to ${profile.userId}, not ${userId}`);
        return res.status(403).json({ error: "Forbidden" });
      }

      console.log(`[analyze route] Profile loaded: "${profile.name}", IFU length=${profile.ifuText.length}`);

      // Load claims and rules
      const claims = await storage.getClaimsByProfileId(profileId);
      const rules = await storage.getRulesByProfileId(profileId);
      console.log(`[analyze route] Claims: ${claims.length}, Rules: ${rules.length}`);

      // Run analysis
      const result = await analyzeContent(profile, claims, rules, content);
      console.log(`[analyze route] Analysis complete: ${result.summary.total} issues found`);
      res.json(result);
    } catch (error: any) {
      console.error("[analysis route] Error:", error?.message || error);
      const message = error?.message || "Analysis failed";
      const status = message.includes("Unauthorized") || message.includes("API key") ? 503 : 500;
      res.status(status).json({ error: message });
    }
  });
}
