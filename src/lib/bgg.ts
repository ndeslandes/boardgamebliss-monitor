import { getBggSessionCookie } from './bgg-auth';

const BGG_API = 'https://boardgamegeek.com/xmlapi2/thing';
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 700;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function parseBggId(bggUrl: string): number | null {
  const m = bggUrl.match(/\/boardgame\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function buildHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    'User-Agent': UA,
    'Accept': 'application/xml,text/xml,*/*',
    'Accept-Language': 'en-CA,en;q=0.9',
  };
  const session = await getBggSessionCookie();
  if (session) h['Cookie'] = session;
  return h;
}

function extractRankFromSection(section: string): number | null {
  for (const m of section.matchAll(/<rank\s[^>]+\/>/g)) {
    const tag = m[0];
    if (!tag.includes('name="boardgame"')) continue;
    const v = tag.match(/\bvalue="(\d+)"/);
    return v ? parseInt(v[1], 10) : null;
  }
  return null;
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  const headers = await buildHeaders();
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { headers });
    if (res.status === 202) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    return res;
  }
  throw new Error(`BGG API did not return data after retries: ${url}`);
}

export async function fetchBggRanks(ids: number[]): Promise<Map<number, number | null>> {
  const result = new Map<number, number | null>();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const url = `${BGG_API}?id=${batch.join(',')}&stats=1`;
    try {
      const res = await fetchWithRetry(url);
      if (res.ok) {
        const xml = await res.text();
        for (const section of xml.split('<item ').slice(1)) {
          const idMatch = section.match(/\bid="(\d+)"/);
          if (!idMatch) continue;
          result.set(parseInt(idMatch[1], 10), extractRankFromSection(section));
        }
      } else {
        for (const id of batch) result.set(id, null);
      }
    } catch {
      for (const id of batch) result.set(id, null);
    }
    if (i + BATCH_SIZE < ids.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }
  return result;
}
