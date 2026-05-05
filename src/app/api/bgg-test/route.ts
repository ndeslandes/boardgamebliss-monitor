import { NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE = { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'en-CA,en;q=0.9' };

async function probe(url: string) {
  try {
    const res = await fetch(url, { headers: BASE, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, length: body.length, snippet: body.slice(0, 500) };
  } catch (e) { return { status: 0, error: String(e) }; }
}

export async function GET() {
  const [rankings, hotness, geekitemsStats] = await Promise.all([
    // Rankings browse API (powers boardgamegeek.com/browse/boardgame)
    probe('https://api.geekdo.com/api/rankings?objecttype=thing&rankobjecttype=subtype&rankobjectid=5497&pageid=1'),
    // Hotness list
    probe('https://api.geekdo.com/api/hotness?objecttype=boardgame'),
    // geekitems with stats param
    probe('https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=224517&subtype=boardgame&stats=1'),
  ]);

  return NextResponse.json({ rankings, hotness, geekitemsStats });
}
