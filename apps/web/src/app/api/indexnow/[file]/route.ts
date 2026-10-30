import { indexNowKey } from '@/lib/seo/indexnow';
import { searchIndexing } from '@/lib/seo/indexing';

/**
 * The IndexNow key file, published at `/<key>.txt` (next.config rewrite, ADR-068): the engines
 * read it to check that the notices come from the site. Only an indexable build has one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const key = indexNowKey(process.env.REVALIDATE_SECRET);
  if (!searchIndexing.indexable || !key || file !== `${key}.txt`) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
