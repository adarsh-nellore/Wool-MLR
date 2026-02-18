import type { Express, Request } from "express";
import { storage } from "../storage";
import { insertProductSchema, updateProductSchema } from "@shared/schema";

function getUserId(req: Request): string {
  return (req as any).user?.claims?.sub || "dev-user";
}

export function registerProductRoutes(app: Express): void {
  // List user's profiles
  app.get("/api/products", async (req: Request, res) => {
    try {
      const userId = getUserId(req);

      const profiles = await storage.getProfilesByUserId(userId);

      // Enrich with claim counts
      const enriched = await Promise.all(
        profiles.map(async (p) => {
          const claims = await storage.getClaimsByProfileId(p.id);
          return { ...p, claimsCount: claims.length };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get single profile with claims and rules
  app.get("/api/products/:id", async (req: Request, res) => {
    try {
      const userId = getUserId(req);

      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const profile = await storage.getProfileById(id);
      if (!profile) return res.status(404).json({ error: "Product not found" });
      if (profile.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const claims = await storage.getClaimsByProfileId(id);
      const rules = await storage.getRulesByProfileId(id);

      res.json({ ...profile, claims, rules });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Create profile + claims + rules (from onboarding wizard)
  app.post("/api/products", async (req: Request, res) => {
    try {
      const userId = getUserId(req);

      const parsed = insertProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      }

      const result = await storage.createProfile(userId, parsed.data);
      res.status(201).json({
        ...result.profile,
        claims: result.claims,
        rules: result.rules,
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Update profile
  app.patch("/api/products/:id", async (req: Request, res) => {
    try {
      const userId = getUserId(req);

      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const profile = await storage.getProfileById(id);
      if (!profile) return res.status(404).json({ error: "Product not found" });
      if (profile.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.errors });
      }

      const updated = await storage.updateProfile(id, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // List analyses for a profile
  app.get("/api/products/:id/analyses", async (req: Request, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const profile = await storage.getProfileById(id);
      if (!profile) return res.status(404).json({ error: "Product not found" });
      if (profile.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      const analyses = await storage.getAnalysesByProfileId(id);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  // Get a single stored analysis
  app.get("/api/analyses/:id", async (req: Request, res) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const analysis = await storage.getAnalysisById(id);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });

      const profile = await storage.getProfileById(analysis.profileId);
      if (!profile || profile.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // Delete profile
  app.delete("/api/products/:id", async (req: Request, res) => {
    try {
      const userId = getUserId(req);

      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const profile = await storage.getProfileById(id);
      if (!profile) return res.status(404).json({ error: "Product not found" });
      if (profile.userId !== userId) return res.status(403).json({ error: "Forbidden" });

      await storage.deleteProfile(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
}
