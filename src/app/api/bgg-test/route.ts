import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE_HEADERS = { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-CA,en;q=0.9' };

async function probe(url: string, extra: Record<string, string> = {}) {
  try {
    const res = await fetch(url, { headers: { ...BASE_HEADERS, ...extra }, redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, length: body.length, snippet: body.slice(0, 300) };
  } catch (e) { return { status: 0, error: String(e) }; }
}

export async function GET() {
  const cfg = getConfig();

  // Step 1: web-form login — captures bggusername + bggpassword cookies (not just SessionID)
  let webCookies = '';
  if (cfg.bggUsername && cfg.bggPassword) {
    const loginRes = await fetch('https://boardgamegeek.com/login/api/v1', {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials: { username: cfg.bggUsername, password: cfg.bggPassword } }),
    });
    // collect all Set-Cookie header values
    const raw = loginRes.headers.getSetCookie?.() ?? [];
    webCookies = raw.map((c: string) => c.split(';')[0]).join('; ');
  }

  const [xmlWithCookies, dump] = await Promise.all([
    // XML API v2 with all cookies from login
    probe('https://boardgamegeek.com/xmlapi2/thing?id=224517&stats=1', webCookies ? { Cookie: webCookies } : {}),
    // BGG public data dump (all game ranks as gzip CSV)
    probe('https://boardgamegeek.com/data_dumps/bg_ranks'),
  ]);

  return NextResponse.json({
    webCookies: webCookies || '(no credentials stored)',
    xmlWithAllCookies: xmlWithCookies,
    dataDump: dump,
  });
}
