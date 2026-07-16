/**
 * Vercel Serverless Entry Point — uses the compiled JS output from tsc.
 * Vercel's build step runs `npm run build` (tsc) which compiles src/ → dist/.
 * This file simply re-exports the compiled Express app from dist/app.js
 * so Vercel can treat it as a standard Node.js serverless function.
 */
const app = require('../dist/app').default
module.exports = app
