import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, hasRank: body.includes('rank') || body.includes('Rank'), snippet: body.slice(0, 400) };
  } catch (e) { return { status: 0, error: String(e) }; }
}

export async function GET() {
  const { bggUsername } = getConfig();
  const [rss, collection] = await Promise.all([
    probe(`https://boardgamegeek.com/rss/geekitems?username=${bggUsername}&objecttype=collection&type=boardgame`),
    probe(`https://boardgamegeek.com/collection/user/${bggUsername}?stats=1&rss=1`),
  ]);
  return NextResponse.json({ rss, collection });
}
