const BGG_API = 'https://boardgamegeek.com/xmlapi2/thing';
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 700;
const HEADERS = { 'User-Agent': 'boardgamebliss-monitor/1.0' };

export function parseBggId(bggUrl: string): number | null {
  const m = bggUrl.match(/\/boardgame\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractRankFromSection(section: string): number | null {
  // Find all self-closing <rank .../> tags, pick the one with name="boardgame"
  for (const m of section.matchAll(/<rank\s[^>]+\/>/g)) {
    const tag = m[0];
    if (!tag.includes('name="boardgame"')) continue;
    const v = tag.match(/\bvalue="(\d+)"/);
    return v ? parseInt(v[1], 10) : null;
  }
  return null;
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { headers: HEADERS });
    // BGG returns 202 when it queued the request; retry after a pause
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
        // Split on each <item opening tag; first chunk is the XML declaration
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
