import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getBggSessionCookie } from '@/lib/bgg-auth';

export async function GET() {
  const cfg = getConfig();
  const session = await getBggSessionCookie();

  if (!session) {
    return NextResponse.json({ error: 'No BGG credentials configured. Set username + password on /poll.' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/xml,text/xml,*/*',
    'Cookie': session,
  };

  const res = await fetch('https://boardgamegeek.com/xmlapi2/thing?id=224517&stats=1', { headers });
  const body = await res.text();
  return NextResponse.json({
    sessionObtained: true,
    bggUsername: cfg.bggUsername,
    apiStatus: res.status,
    hasItem: body.includes('<item '),
    hasRank: body.includes('<rank '),
    snippet: body.slice(0, 400),
  });
}
