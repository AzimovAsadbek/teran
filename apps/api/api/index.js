// Vercel function: every request is rewritten here (vercel.json) and served by the API, bundled
// into one ES module by scripts/bundle-serverless.ts.
export { default } from '../dist/vercel/handler.mjs';
