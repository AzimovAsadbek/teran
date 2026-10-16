import { NextResponse, type NextRequest } from 'next/server';

const MEDIA_PATH = /^(\/(?:ru|en|uz))?\/media\/?$/;
const KIND_PAGES: Record<string, string> = { photo: 'photos', video: 'videos' };

/**
 * Photographs and films used to share one page filtered with ?kind=photo|video; each now has its
 * own page (/media/photos, /media/videos). Old links get a real 308 there, page number kept,
 * before rendering starts. An unknown kind leads to the overview.
 */
export function legacyMediaRedirect(request: NextRequest): NextResponse | null {
  const match = MEDIA_PATH.exec(request.nextUrl.pathname);
  const kind = request.nextUrl.searchParams.get('kind');
  if (!match || kind === null) return null;
  const page = KIND_PAGES[kind];
  const target = new URL(`${match[1] ?? ''}/media${page ? `/${page}` : ''}`, request.url);
  const number = request.nextUrl.searchParams.get('page');
  if (page && number && /^\d{1,4}$/.test(number) && number !== '1') {
    target.searchParams.set('page', number);
  }
  return NextResponse.redirect(target, 308);
}
