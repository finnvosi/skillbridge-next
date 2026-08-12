// Local config for the API — inlined so the package can deploy standalone
// (no workspace `@skillbridge/config` dependency required at build time).
// All values fall back to the same defaults as the shared config package.

export const appConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  },
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || "your-super-secret-key",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
};

export default { appConfig, jwtConfig };
