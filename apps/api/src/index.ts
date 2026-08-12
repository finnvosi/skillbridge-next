import dotenv from "dotenv";

// Load environment variables FIRST so appConfig picks up correct port/JWT values
dotenv.config();

import { createApp } from "./app";

// Standalone dev / production server entry.
// In a serverless (Vercel) context this module is never executed as the
// process entry — the Next.js bridge mounts the app instead.
const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 SkillBridge API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API docs: http://localhost:${PORT}/api/v1`);
});

export default app;
