import type { User } from "@shared/schema";

interface AuthUpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: AuthUpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  private users = new Map<string, User>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: AuthUpsertUser): Promise<User> {
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
}

export const authStorage = new AuthStorage();
