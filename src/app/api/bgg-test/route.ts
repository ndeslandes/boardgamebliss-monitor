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
    const [r1, r2] = await Promise.all([
      fetch('https://boardgamegeek.com/xmlapi2/thing?id=224517&stats=1', { headers }),
      fetch('https://api.geekdo.com/xmlapi2/thing?id=224517&stats=1', { headers }),
    ]);
    const [b1, b2] = await Promise.all([r1.text(), r2.text()]);
    return NextResponse.json({
      bgg:    { status: r1.status, hasItem: b1.includes('<item '), hasRank: b1.includes('<rank '), snippet: b1.slice(0, 300) },
      geekdo: { status: r2.status, hasItem: b2.includes('<item '), hasRank: b2.includes('<rank '), snippet: b2.slice(0, 300) },
      hasCookie: !!bggCookie,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
