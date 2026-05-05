import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function GET() {
  const { bggCookie } = getConfig();
  const headers: Record<string, string> = {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Accept-Language': 'en-CA,en;q=0.9',
  };
  if (bggCookie) headers['Cookie'] = bggCookie;

  // Probe the BGG login endpoint with bad credentials — just to see the shape of the response
  const loginRes = await fetch('https://boardgamegeek.com/login/api/v1', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials: { username: 'test_invalid_user_xyz', password: 'bad_password' } }),
  });
  const loginBody = await loginRes.text();
  const loginCookies = loginRes.headers.get('set-cookie');

  // Also try geekitems with showstats
  const statsRes = await fetch(
    'https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=224517&subtype=boardgame&showstats=1',
    { headers }
  );
  const statsJson = await statsRes.json();

  return NextResponse.json({
    login: { status: loginRes.status, body: loginBody.slice(0, 400), setCookie: loginCookies },
    geekitemsWithStats: {
      status: statsRes.status,
      extraKeys: Object.keys(statsJson?.item ?? {}).filter((k: string) =>
        ['rank', 'stat', 'rating', 'score', 'award'].some(w => k.toLowerCase().includes(w))
      ),
      links: statsJson?.item?.links ? JSON.stringify(statsJson.item.links).slice(0, 500) : '(no links)',
    },
  });
}
