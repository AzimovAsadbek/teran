/**
 * After demo data changes, asks the storefront to drop its cached catalogue, content and settings
 * through the same webhook the API uses (WEB_REVALIDATE_URL + REVALIDATE_SECRET). Best effort: a
 * storefront that is not running simply keeps serving its cache until it expires (within the hour).
 */
export async function refreshStorefrontCache(
  env: Record<string, string | undefined>,
): Promise<string> {
  const url = env.WEB_REVALIDATE_URL;
  const secret = env.REVALIDATE_SECRET;
  if (!url || !secret) {
    return 'Storefront cache not refreshed (WEB_REVALIDATE_URL or REVALIDATE_SECRET is not set); cached pages expire within the hour.';
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Revalidate-Secret': secret },
      body: JSON.stringify({ tags: ['catalog', 'content', 'settings'] }),
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok
      ? 'Storefront cache refreshed.'
      : `Storefront refused the cache refresh (HTTP ${response.status}); cached pages expire within the hour.`;
  } catch {
    return 'Storefront not reachable; its cached pages expire within the hour.';
  }
}
