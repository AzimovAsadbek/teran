import { config } from 'zod';

/*
 * Runs in the browser before hydration. Zod checks whether `eval` is allowed (to compile faster
 * parsers) by calling `Function("")`; the Content Security Policy forbids eval, so the check only
 * produces a CSP violation report. Jitless mode skips it; validation results are identical.
 */
config({ jitless: true });
