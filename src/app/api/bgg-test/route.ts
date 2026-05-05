import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE = { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-CA,en;q=0.9' };

async function probe(url: string, extra: Record<string, string> = {}) {
  try {
    const res = await fetch(url, { headers: { ...BASE, ...extra }, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, length: body.length, snippet: body.slice(0, 500) };
  } catch (e) { return { status: 0, error: String(e) }; }
}

export async function GET() {
  const [htmlPage, geekPreview, linkedItems] = await Promise.all([
    // The actual BGG game page — Angular SPA but might have SSR rank data or meta tags
    probe('https://boardgamegeek.com/boardgame/224517/brass-birmingham'),
    // Geekdo internal endpoints
    probe('https://api.geekdo.com/api/geekpreview?objecttype=thing&objectid=224517'),
    probe('https://api.geekdo.com/api/linkeditems?objecttype=thing&objectid=224517&linktype=boardgamerank&pageid=1'),
  ]);

  // Extract rank from HTML page if present
  let rankInHtml: string | null = null;
  if (typeof htmlPage.snippet === 'string') {
    const m = (htmlPage.snippet + '').match(/"rank"\s*:\s*(\d+)/);
    rankInHtml = m ? m[1] : null;
  }

  return NextResponse.json({ htmlPage: { ...htmlPage, rankInHtml }, geekPreview, linkedItems });
}
