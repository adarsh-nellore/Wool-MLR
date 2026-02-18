import type {
  User,
  ProductProfile,
  CoreClaim,
  PromoRule,
  InsertProduct,
  StoredAnalysis,
  AnalysisResponse,
} from "@shared/schema";

export interface IStorage {
  // User ops
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: Partial<User> & { id: string }): Promise<User>;

  // Product profile ops
  getProfilesByUserId(userId: string): Promise<ProductProfile[]>;
  getProfileById(id: number): Promise<ProductProfile | undefined>;
  createProfile(userId: string, data: InsertProduct): Promise<{ profile: ProductProfile; claims: CoreClaim[]; rules: PromoRule[] }>;
  updateProfile(id: number, data: Partial<ProductProfile>): Promise<ProductProfile | undefined>;
  deleteProfile(id: number): Promise<boolean>;

  // Claim ops
  getClaimsByProfileId(profileId: number): Promise<CoreClaim[]>;

  // Rule ops
  getRulesByProfileId(profileId: number): Promise<PromoRule[]>;

  // Analysis ops
  saveAnalysis(profileId: number, content: string, response: AnalysisResponse): Promise<StoredAnalysis>;
  getAnalysesByProfileId(profileId: number): Promise<StoredAnalysis[]>;
  getAnalysisById(id: number): Promise<StoredAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private profiles = new Map<number, ProductProfile>();
  private claims = new Map<number, CoreClaim>();
  private rules = new Map<number, PromoRule>();
  private nextProfileId = 1;
  private nextClaimId = 1;
  private nextRuleId = 1;
  private analyses = new Map<number, StoredAnalysis>();
  private nextAnalysisId = 1;

  // ── Users ──
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: Partial<User> & { id: string }): Promise<User> {
    const existing = this.users.get(userData.id);
    const now = new Date();
    const user: User = {
      id: userData.id,
      email: userData.email ?? existing?.email ?? null,
      firstName: userData.firstName ?? existing?.firstName ?? null,
      lastName: userData.lastName ?? existing?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existing?.profileImageUrl ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.users.set(userData.id, user);
    return user;
  }

  // ── Product Profiles ──
  async getProfilesByUserId(userId: string): Promise<ProductProfile[]> {
    return Array.from(this.profiles.values()).filter(p => p.userId === userId);
  }

  async getProfileById(id: number): Promise<ProductProfile | undefined> {
    return this.profiles.get(id);
  }

  async createProfile(
    userId: string,
    data: InsertProduct
  ): Promise<{ profile: ProductProfile; claims: CoreClaim[]; rules: PromoRule[] }> {
    const now = new Date();
    const profileId = this.nextProfileId++;

    const profile: ProductProfile = {
      id: profileId,
      name: data.name,
      deviceType: data.deviceType,
      oneLiner: data.oneLiner ?? "",
      ifuText: data.ifuText,
      populationText: data.populationText ?? "",
      risksText: data.risksText,
      regions: data.regions ?? [],
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(profileId, profile);

    // Create claims
    const createdClaims: CoreClaim[] = (data.claims ?? []).map(c => {
      const claim: CoreClaim = {
        id: this.nextClaimId++,
        profileId,
        claimText: c.claimText,
        claimType: c.claimType ?? "general",
        evidenceType: c.evidenceType ?? "",
        reference: c.reference ?? "",
      };
      this.claims.set(claim.id, claim);
      return claim;
    });

    // Create rules
    const createdRules: PromoRule[] = (data.rules ?? []).map(r => {
      const rule: PromoRule = {
        id: this.nextRuleId++,
        profileId,
        ruleText: r.ruleText,
        isDefault: r.isDefault ?? false,
      };
      this.rules.set(rule.id, rule);
      return rule;
    });

    return { profile, claims: createdClaims, rules: createdRules };
  }

  async updateProfile(id: number, data: Partial<ProductProfile>): Promise<ProductProfile | undefined> {
    const existing = this.profiles.get(id);
    if (!existing) return undefined;

    const updated: ProductProfile = {
      ...existing,
      ...data,
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.profiles.set(id, updated);
    return updated;
  }

  async deleteProfile(id: number): Promise<boolean> {
    if (!this.profiles.has(id)) return false;
    this.profiles.delete(id);
    // Cascade delete claims and rules
    Array.from(this.claims.entries()).forEach(([claimId, claim]) => {
      if (claim.profileId === id) this.claims.delete(claimId);
    });
    Array.from(this.rules.entries()).forEach(([ruleId, rule]) => {
      if (rule.profileId === id) this.rules.delete(ruleId);
    });
    Array.from(this.analyses.entries()).forEach(([analysisId, analysis]) => {
      if (analysis.profileId === id) this.analyses.delete(analysisId);
    });
    return true;
  }

  // ── Claims ──
  async getClaimsByProfileId(profileId: number): Promise<CoreClaim[]> {
    return Array.from(this.claims.values()).filter(c => c.profileId === profileId);
  }

  // ── Rules ──
  async getRulesByProfileId(profileId: number): Promise<PromoRule[]> {
    return Array.from(this.rules.values()).filter(r => r.profileId === profileId);
  }

  // ── Analyses ──
  async saveAnalysis(profileId: number, content: string, response: AnalysisResponse): Promise<StoredAnalysis> {
    const analysis: StoredAnalysis = {
      id: this.nextAnalysisId++,
      profileId,
      content,
      results: response.results,
      summary: response.summary,
      createdAt: new Date(),
    };
    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  async getAnalysesByProfileId(profileId: number): Promise<StoredAnalysis[]> {
    return Array.from(this.analyses.values())
      .filter(a => a.profileId === profileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAnalysisById(id: number): Promise<StoredAnalysis | undefined> {
    return this.analyses.get(id);
  }
}

export const storage = new MemStorage();

// Seed a default product profile so the app is immediately usable after server restart
storage.createProfile("dev-user", {
  name: "CardioFlow X1",
  deviceType: "implant",
  oneLiner: "Next-generation cardiac catheter system for minimally invasive coronary interventions.",
  ifuText: "The CardioFlow X1 Catheter System is indicated for use in percutaneous coronary interventions (PCI) including balloon angioplasty and stent delivery in adult patients with coronary artery disease. The device is intended for use by trained interventional cardiologists in a catheterization laboratory setting.",
  populationText: "Adult patients (18+) undergoing percutaneous coronary interventions in hospital catheterization laboratories.",
  risksText: "Contraindicated in patients with known hypersensitivity to catheter materials (polyurethane, silicone). Not indicated for use in pediatric patients. Risks include vessel perforation, dissection, thrombosis, distal embolization, and arrhythmia. Use caution in patients with severely calcified lesions or chronic total occlusions. Device should not be re-sterilized or reused.",
  regions: ["US"],
  claims: [
    { claimText: "Designed to facilitate rapid lesion crossing in coronary interventions.", claimType: "efficacy", evidenceType: "clinical", reference: "" },
    { claimText: "Low-profile catheter tip may help reduce procedural time.", claimType: "efficacy", evidenceType: "clinical", reference: "" },
    { claimText: "Compatible with standard 6F guide catheters for broad procedural flexibility.", claimType: "feature", evidenceType: "", reference: "" },
  ],
  rules: [
    { ruleText: "Avoid superlatives and absolutes (best, only, cure, 100%, guaranteed, zero risk, etc.)", isDefault: true },
    { ruleText: "Do not imply diagnostic use if the device is only cleared for screening or decision-support.", isDefault: true },
    { ruleText: "Do not reference populations or settings outside the cleared indications.", isDefault: true },
    { ruleText: "Always include at least one risk/limitation statement in any asset that contains benefit claims.", isDefault: true },
  ],
});
