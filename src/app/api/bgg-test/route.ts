import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function GET() {
  const { bggCookie } = getConfig();
  const headers: Record<string, string> = {
    'User-Agent': UA,
    'Accept': 'application/xml,text/xml,*/*',
    'Accept-Language': 'en-CA,en;q=0.9',
  };
  if (bggCookie) headers['Cookie'] = bggCookie;

  try {
    // Brass: Birmingham — a known ranked game
    const res = await fetch('https://boardgamegeek.com/xmlapi2/thing?id=224517&stats=1', { headers });
    const body = await res.text();
    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      hasCookie: !!bggCookie,
      cookieLength: bggCookie?.length ?? 0,
      bodySnippet: body.slice(0, 600),
      hasItemTag: body.includes('<item '),
      hasRankTag: body.includes('<rank '),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
