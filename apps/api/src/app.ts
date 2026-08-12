import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { appConfig } from "@skillbridge/config";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import projectsRoutes from "./routes/projects.routes";
import certificatesRoutes from "./routes/certificates.routes";
import adminRoutes from "./routes/admin.routes";
import * as path from "path";

// Build the Express application without starting a listener.
// Reused both by the standalone dev server (index.ts) and by the
// Next.js serverless bridge so the SAME business logic ships in one deploy.
export function createApp() {
  const app = express();

  // Trust the proxy hop (Next.js dev rewrite / Vercel reverse proxy) so
  // rate-limit can read X-Forwarded-For.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: appConfig.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  const limiter = rateLimit({
    windowMs: appConfig.rateLimit.windowMs,
    max: appConfig.rateLimit.max,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", limiter);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/projects", projectsRoutes);
  app.use("/api/v1/certificates", certificatesRoutes);
  app.use("/api/v1/admin", adminRoutes);

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/api/v1", (_req, res) => {
    res.json({
      message: "SkillBridge API v1",
      status: "running",
      endpoints: { auth: "/api/v1/auth", users: "/api/v1/users", projects: "/api/v1/projects" },
    });
  });

  // Error handling middleware
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  return app;
}

const app = createApp();
export default app;
