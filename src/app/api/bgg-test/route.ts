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

  // Test single and batch (comma-separated objectids)
  const [single, batch] = await Promise.all([
    fetch('https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=224517&subtype=boardgame', { headers }),
    fetch('https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=224517,174430&subtype=boardgame', { headers }),
  ]);

  const singleJson = await single.json();
  const batchText = await batch.text();

  return NextResponse.json({
    single: {
      status: single.status,
      rankinfo: singleJson?.item?.rankinfo ?? singleJson?.item?.stats ?? '(not found at item.rankinfo)',
      keys: singleJson?.item ? Object.keys(singleJson.item) : [],
    },
    batch: {
      status: batch.status,
      snippet: batchText.slice(0, 200),
    },
  });
}
