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
  isSample?: boolean;
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

// ── Marketing Medium Constants ──

export const MARKETING_MEDIUMS = [
  "social_media",
  "print_ad",
  "website",
  "email_campaign",
  "trade_show",
  "brochure",
  "press_release",
  "hcp_detail_aid",
  "patient_education",
  "other",
] as const;

export type MarketingMedium = (typeof MARKETING_MEDIUMS)[number];

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
  ephemeral: z.boolean().optional(),
  medium: z.string().min(1).default("other"),
});

export const analyzeUploadSchema = z.object({
  profileId: z.coerce.number().int().positive(),
  medium: z.string().min(1).default("other"),
});

// ── Boundary Drift Types ──

export type DriftType =
  | "Diagnostic Drift"
  | "Therapeutic Drift"
  | "Preventive Drift"
  | "Standalone Drift"
  | "Classification Escalation"
  | "Population Expansion"
  | "Use Environment Expansion"
  | "Intended Use Redefinition";

export type DriftLevel = 0 | 1 | 2 | 3 | 4;

export type ExposureTag =
  | "Substantiation Exposure"
  | "Liability Exposure"
  | "Advertising Exposure";

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
  driftType: DriftType;
  driftLevel: DriftLevel;
  exposureTags: ExposureTag[];
  boundaryReference: string;
  imageId?: string;
  imageLabel?: string;
  pageNumber?: number;
}

export interface AnalysisResponse {
  results: AnalysisResult[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    imageFindings?: number;
    driftLevels: { level: DriftLevel; count: number }[];
  };
}

// ── Stored Image (for persisted analyses) ──

export interface StoredImage {
  id: string;
  data: string; // base64
  mediaType: string;
  sourceLabel: string;
}

// ── Lead (landing page signups) ──

export interface Lead {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export const insertLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});

export type InsertLead = z.infer<typeof insertLeadSchema>;

// ── Stored Document (original uploaded file) ──

export interface StoredDocument {
  data: string; // base64
  mimeType: string;
  fileName: string;
  pageCount?: number;
}

// ── Stored Analysis (persisted per device) ──

export interface StoredAnalysis {
  id: number;
  profileId: number;
  content: string;
  results: AnalysisResult[];
  summary: AnalysisResponse["summary"];
  images?: StoredImage[];
  originalDocument?: StoredDocument;
  createdAt: Date;
}
