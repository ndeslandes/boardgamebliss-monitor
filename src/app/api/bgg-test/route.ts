import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getBggSessionCookie } from '@/lib/bgg-auth';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(url: string, cookie?: string) {
  const headers: Record<string, string> = { 'User-Agent': UA, 'Accept': '*/*' };
  if (cookie) headers['Cookie'] = cookie;
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, hasRank: body.includes('<rank ') || body.includes('"rank"'), snippet: body.slice(0, 300) };
  } catch (e) { return { status: 0, error: String(e) }; }
}

export async function GET() {
  const cfg = getConfig();
  const session = await getBggSessionCookie();

  const [collectionNoAuth, collectionWithSession] = await Promise.all([
    // Public collection — historically worked without auth
    probe(`https://boardgamegeek.com/xmlapi2/collection?username=${cfg.bggUsername}&stats=1&subtype=boardgame`),
    // Same but with session cookie
    probe(`https://boardgamegeek.com/xmlapi2/collection?username=${cfg.bggUsername}&stats=1&subtype=boardgame`, session ?? undefined),
  ]);

  return NextResponse.json({ collectionNoAuth, collectionWithSession, username: cfg.bggUsername });
}
