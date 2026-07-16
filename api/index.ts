/**
 * Vercel Serverless Entry Point
 *
 * @vercel/node compiles this with ncc/esbuild at deploy time,
 * bundling all imports from src/ automatically.
 * We just export the Express app — Vercel wraps it as a serverless function.
 */
import app from '../src/app'

export default app
