/**
 * Runs `task` once the page has loaded and the browser is idle (or after a few seconds at most),
 * for code and data that should never compete with the first paint. Returns a cancel function.
 */
export function whenIdle(task: () => void, timeout = 4000): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timer: number | undefined;
  const run = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => !cancelled && task(), { timeout });
    } else {
      timer = window.setTimeout(() => !cancelled && task(), 200);
    }
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    if (idleId !== undefined) window.cancelIdleCallback(idleId);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}
