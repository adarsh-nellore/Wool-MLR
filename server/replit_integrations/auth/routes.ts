import type { Express } from "express";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", async (req: any, res) => {
    // Return a dev user when no auth is configured
    const user = req.isAuthenticated?.() && req.user?.claims?.sub
      ? await (await import("./storage")).authStorage.getUser(req.user.claims.sub)
      : null;

    if (user) {
      return res.json(user);
    }

    // Dev fallback user
    res.json({
      id: "dev-user",
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
      profileImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}
