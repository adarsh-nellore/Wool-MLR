import { z } from "zod";

// ── User ──
export interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Product Profile ──
export interface ProductProfile {
  id: number;
  name: string;
  deviceType: string;
  oneLiner: string;
  ifuText: string;
  populationText: string;
  risksText: string;
  regions: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Core Claim ──
export interface CoreClaim {
  id: number;
  profileId: number;
  claimText: string;
  claimType: string;
  evidenceType: string;
  reference: string;
}

// ── Promotional Rule ──
export interface PromoRule {
  id: number;
  profileId: number;
  ruleText: string;
  isDefault: boolean;
}

// ── Zod Validation Schemas ──

export const insertProductSchema = z.object({
  name: z.string().min(2),
  deviceType: z.string().min(1),
  oneLiner: z.string().max(200).default(""),
  ifuText: z.string().min(10),
  populationText: z.string().default(""),
  risksText: z.string().min(10),
  regions: z.array(z.string()).default([]),
  claims: z.array(z.object({
    claimText: z.string().min(1),
    claimType: z.string().default("general"),
    evidenceType: z.string().default(""),
    reference: z.string().default(""),
  })).default([]),
  rules: z.array(z.object({
    ruleText: z.string().min(1),
    isDefault: z.boolean().default(false),
  })).default([]),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  deviceType: z.string().min(1).optional(),
  oneLiner: z.string().max(200).optional(),
  ifuText: z.string().min(10).optional(),
  populationText: z.string().optional(),
  risksText: z.string().min(10).optional(),
  regions: z.array(z.string()).optional(),
});

export const analyzeContentSchema = z.object({
  profileId: z.number().int().positive(),
  content: z.string().min(1),
});

// ── Analysis Result Types ──

export interface AnalysisResult {
  id: string;
  original: string;
  type: "Performance" | "Safety" | "Marketing" | "Procedural";
  issue: string;
  severity: "high" | "medium" | "low" | "none";
  reason: string;
  suggestion: string;
  start: number;
  end: number;
}

export interface AnalysisResponse {
  results: AnalysisResult[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}
