/*
 * Runs in the browser before hydration. Zod checks whether `eval` is allowed (to compile faster
 * parsers) by calling `Function("")`; the Content Security Policy forbids eval, so the check only
 * produces a CSP violation report. Jitless mode skips it; validation results are identical.
 *
 * Zod keeps its settings in one object on globalThis, shared by every copy of the library (this is
 * what `config()` writes). Setting the flag there directly keeps Zod itself out of the code every
 * page loads: it arrives with the first form that needs it and finds the flag already set.
 */
const zodGlobal = globalThis as typeof globalThis & {
  __zod_globalConfig?: { jitless?: boolean };
};
(zodGlobal.__zod_globalConfig ??= {}).jitless = true;

export {};
