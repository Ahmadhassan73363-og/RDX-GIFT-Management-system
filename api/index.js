// Vercel Serverless Function entry point.
// Vercel routes all /api/* requests here automatically.
// We export the Express app — Vercel wraps it in a serverless handler.

import app from '../server/app.js';

export default app;
