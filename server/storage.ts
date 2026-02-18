import type {
  User,
  ProductProfile,
  CoreClaim,
  PromoRule,
  InsertProduct,
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
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private profiles = new Map<number, ProductProfile>();
  private claims = new Map<number, CoreClaim>();
  private rules = new Map<number, PromoRule>();
  private nextProfileId = 1;
  private nextClaimId = 1;
  private nextRuleId = 1;

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
}

export const storage = new MemStorage();
