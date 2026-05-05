import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(url: string, headers: Record<string, string>) {
  try {
    const r = await fetch(url, { headers });
    const body = await r.text();
    return { status: r.status, hasItem: body.includes('<item') || body.includes('"id"'), hasRank: body.includes('rank') || body.includes('Rank'), snippet: body.slice(0, 300) };
  } catch (e) {
    return { status: 0, error: String(e) };
  }
}

export async function GET() {
  const { bggCookie } = getConfig();
  const headers: Record<string, string> = {
    'User-Agent': UA,
    'Accept': '*/*',
    'Accept-Language': 'en-CA,en;q=0.9',
  };
  if (bggCookie) headers['Cookie'] = bggCookie;

  const [v2, v1, json] = await Promise.all([
    probe('https://boardgamegeek.com/xmlapi2/thing?id=224517&stats=1', headers),
    probe('https://boardgamegeek.com/xmlapi/boardgame/224517?stats=1', headers),
    probe('https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=224517&subtype=boardgame', { ...headers, 'Accept': 'application/json' }),
  ]);

  return NextResponse.json({ v2, v1, json, hasCookie: !!bggCookie });
}
