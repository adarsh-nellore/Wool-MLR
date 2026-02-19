import type { Express } from "express";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "../replit_integrations/auth";
import { registerProductRoutes } from "./productRoutes";
import { registerAnalysisRoutes } from "./analysisRoutes";
import { registerLeadRoutes } from "./leadRoutes";

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Setup Replit Auth (sessions + passport + OIDC routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Public routes (no auth)
  registerLeadRoutes(app);

  // Application routes
  registerProductRoutes(app);
  registerAnalysisRoutes(app);

  return server;
}
