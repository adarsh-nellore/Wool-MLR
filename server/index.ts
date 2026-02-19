import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { sanitizeInputs } from "./middleware/sanitize";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

app.set("trust proxy", true);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  // Security headers
  const isDev = process.env.NODE_ENV !== "production";
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: isDev
            ? ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
            : ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: isDev
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
            : ["'self'", "'wasm-unsafe-eval'"],
          connectSrc: isDev
            ? ["'self'", "wss:"]
            : ["'self'"],
          workerSrc: ["'self'", "blob:"],
          imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
        },
      },
      crossOriginOpenerPolicy: { policy: "unsafe-none" },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? true
          : ["http://localhost:5173", `http://localhost:${PORT}`],
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
  app.use(cookieParser());

  // XSS sanitization on API routes
  app.use("/api", sanitizeInputs);

  // Rate limiting on API routes
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Request logging (dev only)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });

  // Register all routes (auth + API) — creates httpServer internally
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err);
    const status = err.status || err.statusCode || 500;
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    if (res.headersSent) return next(err);
    res.status(status).json({ error: message });
  });

  // Vite dev server or static serving
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(server, app);
  }

  server.listen({ port: PORT, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${PORT}`);
  });
})();
