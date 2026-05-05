import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE = { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'en-CA,en;q=0.9' };

function findPaths(obj: unknown, keyword: string, path = ''): string[] {
  const results: string[] = [];
  if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (k.toLowerCase().includes(keyword)) results.push(`${p} = ${JSON.stringify(v).slice(0, 100)}`);
      results.push(...findPaths(v, keyword, p));
    }
  }
  return results;
}

export async function GET() {
  const res = await fetch(
    'https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=224517&subtype=boardgame&stats=1',
    { headers: BASE }
  );
  const json = await res.json();

  return NextResponse.json({
    status: res.status,
    topKeys: Object.keys(json?.item ?? {}),
    rankPaths: findPaths(json, 'rank'),
    statPaths: findPaths(json, 'stat'),
    ratingPaths: findPaths(json, 'rating'),
  });
}
