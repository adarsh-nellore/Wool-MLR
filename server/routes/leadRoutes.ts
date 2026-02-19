import type { Express } from "express";
import { storage } from "../storage";
import { insertLeadSchema } from "@shared/schema";
import { log } from "../index";

export function registerLeadRoutes(app: Express) {
  // Public endpoint — no auth required
  app.post("/api/leads", async (req, res) => {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    try {
      const lead = await storage.createLead(parsed.data);
      log(`New lead: ${lead.name} <${lead.email}>`);
      res.status(201).json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save. Please try again." });
    }
  });
}
