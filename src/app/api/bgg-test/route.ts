import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE = { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-CA,en;q=0.9' };

function parseSetCookies(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const parts = h.split(';');
    const [rawName, ...rest] = parts[0].split('=');
    const name = rawName.trim();
    const value = rest.join('=').trim();
    const maxAge = parts.find(p => p.trim().toLowerCase().startsWith('max-age='));
    const isDelete = value === 'deleted' || (maxAge != null && parseInt(maxAge.split('=')[1]) <= 0);
    if (isDelete) { delete map[name]; } else { map[name] = value; }
  }
  return map;
}

export async function GET() {
  const cfg = getConfig();
  if (!cfg.bggUsername || !cfg.bggPassword) {
    return NextResponse.json({ error: 'No credentials — set them on /poll first.' });
  }

  const loginRes = await fetch('https://boardgamegeek.com/login/api/v1', {
    method: 'POST',
    headers: { ...BASE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials: { username: cfg.bggUsername, password: cfg.bggPassword } }),
  });

  const raw: string[] = loginRes.headers.getSetCookie?.() ?? [];
  const cookies = parseSetCookies(raw);
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

  const xmlRes = await fetch('https://boardgamegeek.com/xmlapi2/thing?id=224517&stats=1', {
    headers: { ...BASE, Cookie: cookieStr },
  });
  const body = await xmlRes.text();

  return NextResponse.json({
    loginStatus: loginRes.status,
    cookieNames: Object.keys(cookies),
    cookieStr,
    xmlStatus: xmlRes.status,
    hasItem: body.includes('<item '),
    hasRank: body.includes('<rank '),
    snippet: body.slice(0, 400),
  });
}
