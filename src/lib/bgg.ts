const BGG_API = 'https://boardgamegeek.com/xmlapi2/thing';
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 700;

export function parseBggId(bggUrl: string): number | null {
  const m = bggUrl.match(/\/boardgame\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export async function fetchBggRanks(ids: number[]): Promise<Map<number, number | null>> {
  const result = new Map<number, number | null>();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const url = `${BGG_API}?id=${batch.join(',')}&stats=1`;
    const res = await fetch(url);
    if (res.ok) {
      const xml = await res.text();
      // Split on each <item opening tag; first chunk is the XML header
      for (const section of xml.split('<item ').slice(1)) {
        const idMatch = section.match(/id="(\d+)"/);
        if (!idMatch) continue;
        const id = parseInt(idMatch[1], 10);
        const rankMatch = section.match(/name="boardgame"[^>]*value="(\d+)"/);
        result.set(id, rankMatch ? parseInt(rankMatch[1], 10) : null);
      }
    } else {
      for (const id of batch) result.set(id, null);
    }
    if (i + BATCH_SIZE < ids.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }
  return result;
}
