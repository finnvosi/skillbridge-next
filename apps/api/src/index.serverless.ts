import { createApp } from "./app";

// Serverless entry for Vercel. Vercel's @vercel/node builder wraps the
// exported Express app and serves it as a function. `createApp()` builds the
// app WITHOUT calling app.listen(), so this is safe in a serverless context.
const app = createApp();
export default app;
